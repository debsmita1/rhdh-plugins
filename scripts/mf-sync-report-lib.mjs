/*
 * Copyright Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Core logic: discover plugins, bundle, compare OFS vs NFS sync chunks, hunt static imports.
 */

import { spawnSync } from 'node:child_process';
import {
  access,
  mkdir,
  readdir,
  readFile,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(process.env.MF_REPORT_ROOT ?? path.join(__dirname, '..'));
export const WORKSPACES = path.join(ROOT, 'workspaces');

const IMPORT_RE = /^\s*import\s+(?:type\s+)?(?:[\w*{}\s,]+\s+from\s+)?['"]([^'"]+)['"]/gm;
const DEFAULT_EXPORT_RE = /export\s+default\b/;
const LOADER_ASYNC_RE = /loader\s*:\s*async\b/;
const COMPONENTS_IMPORT_RE = /^\.\.?\/.*components\//;
const ICON_IMPORT_RE = /@(?:material-ui\/icons|mui\/icons-material)/;
const HEAVY_UI_RE = /@(?:backstage\/core-components|material-ui\/core|mui\/material|mui\/lab)/;

const BLUEPRINT_PATTERNS = [
  { id: 'app-root-element', re: /AppRootElementBlueprint/ },
  { id: 'app-root-wrapper', re: /AppRootWrapperBlueprint/ },
  { id: 'nav-item', re: /NavItemBlueprint/ },
  { id: 'page-blueprint', re: /PageBlueprint/ },
  { id: 'search-filter', re: /SearchFilterResultTypeBlueprint/ },
  { id: 'home-layout', re: /HomePageLayoutBlueprint/ },
];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, filter, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, filter, out);
    else if (filter(full)) out.push(full);
  }
  return out;
}

const MIN_BUNDLE_CLI_VERSION = '0.36.0';
const DEFAULT_BUNDLE_CACHE_MS = 10 * 60 * 1000;

function parseCliVersion(output) {
  const matches = String(output).match(/\d+\.\d+(?:\.\d+)?/g);
  return matches ? matches[matches.length - 1] : '';
}

function semverNum(v) {
  const m = String(v).match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!m) return 0;
  return Number(m[1]) * 100_000 + Number(m[2]) * 1_000 + Number(m[3] ?? 0);
}

async function readJson(p) {
  return JSON.parse(await readFile(p, 'utf8'));
}

function collectFlagValues(args, flag) {
  const values = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === flag && args[i + 1]) values.push(args[++i]);
  }
  return values;
}

function normalizeExtraWorkspaces(paths) {
  return [...new Set(paths.map(p => path.resolve(p)))];
}

function exportEntryPath(pluginDir, spec) {
  if (!spec || typeof spec !== 'string') return null;
  return path.join(pluginDir, spec.replace(/^\.\//, ''));
}

function resolveExportLayout(exports, pluginDir) {
  const hasAlpha = exports && typeof exports === 'object' && './alpha' in exports;
  const hasLegacy = exports && typeof exports === 'object' && './legacy' in exports;
  const primaryPath = exportEntryPath(pluginDir, exports?.['.']);
  const translationsPath = hasAlpha ? exportEntryPath(pluginDir, exports['./alpha']) : null;
  const legacyPath = hasLegacy ? exportEntryPath(pluginDir, exports['./legacy']) : null;
  const layout = hasLegacy ? 'graduated' : 'classic';
  const nfsPath = layout === 'graduated' ? primaryPath : translationsPath;
  return {
    layout,
    nfsPath,
    legacyPath,
    translationsPath,
    alphaPath: translationsPath,
  };
}

function isInspectableFrontendPlugin(exports) {
  if (!exports || typeof exports !== 'object') return false;
  return './alpha' in exports || './legacy' in exports;
}

async function discoverPluginsInWorkspace(workspaceRoot, wsLabel, { external = false } = {}) {
  const plugins = [];
  const pluginsDir = path.join(workspaceRoot, 'plugins');
  if (!(await exists(pluginsDir))) return plugins;

  let pluginEntries;
  try {
    pluginEntries = await readdir(pluginsDir, { withFileTypes: true });
  } catch {
    return plugins;
  }

  const cli = path.join(workspaceRoot, 'node_modules', '.bin', 'backstage-cli');

  for (const pe of pluginEntries) {
    if (!pe.isDirectory()) continue;
    const pkgPath = path.join(pluginsDir, pe.name, 'package.json');
    if (!(await exists(pkgPath))) continue;

    let data;
    try {
      data = await readJson(pkgPath);
    } catch {
      continue;
    }

    const role = data.backstage?.role ?? '';
    if (!['frontend-plugin', 'frontend-plugin-module'].includes(role)) continue;
    const exports = data.exports;
    if (!isInspectableFrontendPlugin(exports)) continue;

    const pluginDir = path.dirname(pkgPath);
    const exportLayout = resolveExportLayout(exports, pluginDir);
    plugins.push({
      name: data.name,
      pluginDir,
      ws: wsLabel,
      wsRoot: workspaceRoot,
      external,
      layout: exportLayout.layout,
      nfsPath: exportLayout.nfsPath,
      legacyPath: exportLayout.legacyPath,
      translationsPath: exportLayout.translationsPath,
      alphaPath: exportLayout.alphaPath,
      cli,
      safeName: data.name.replace(/[^a-zA-Z0-9._-]+/g, '_'),
    });
  }

  return plugins;
}

export async function discoverAlphaWorkspaces({
  extraWorkspaces = [],
  externalOnly = false,
} = {}) {
  const plugins = await discoverPlugins({ extraWorkspaces, externalOnly });
  const labels = new Set(plugins.map(p => p.ws));
  return [...labels].sort();
}

async function inspectWorkspaceFrontendPlugins(workspaceRoot) {
  const pluginsDir = path.join(workspaceRoot, 'plugins');
  const withAlpha = [];
  const withoutAlpha = [];
  if (!(await exists(pluginsDir))) return { withAlpha, withoutAlpha };

  let pluginEntries;
  try {
    pluginEntries = await readdir(pluginsDir, { withFileTypes: true });
  } catch {
    return { withAlpha, withoutAlpha };
  }

  for (const pe of pluginEntries) {
    if (!pe.isDirectory()) continue;
    const pkgPath = path.join(pluginsDir, pe.name, 'package.json');
    if (!(await exists(pkgPath))) continue;

    let data;
    try {
      data = await readJson(pkgPath);
    } catch {
      continue;
    }

    const role = data.backstage?.role ?? '';
    if (!['frontend-plugin', 'frontend-plugin-module'].includes(role)) continue;

    const exports = data.exports;
    const hasAlpha = exports && typeof exports === 'object' && './alpha' in exports;
    const hasLegacy = exports && typeof exports === 'object' && './legacy' in exports;
    const entry = { name: data.name, pluginDir: path.dirname(pkgPath) };
    if (hasAlpha || hasLegacy) withAlpha.push(entry);
    else withoutAlpha.push(entry);
  }

  return { withAlpha, withoutAlpha };
}

export async function discoverWorkspaceWarnings(extraWorkspaces = []) {
  const warnings = [];
  for (const workspaceRoot of normalizeExtraWorkspaces(extraWorkspaces)) {
    if (!(await exists(workspaceRoot))) {
      warnings.push({
        workspace: workspaceRoot,
        kind: 'missing',
        message: 'workspace path not found',
      });
      continue;
    }

    const { withAlpha, withoutAlpha } = await inspectWorkspaceFrontendPlugins(workspaceRoot);
    if (!withAlpha.length && !withoutAlpha.length) {
      warnings.push({
        workspace: workspaceRoot,
        kind: 'no-frontend-plugins',
        message: 'no frontend-plugin or frontend-plugin-module packages under plugins/',
      });
      continue;
    }

    if (!withAlpha.length && withoutAlpha.length) {
      warnings.push({
        workspace: workspaceRoot,
        kind: 'no-alpha-export',
        message:
          'frontend plugins found but none export "./alpha" (required for NFS bundle inspection)',
        plugins: withoutAlpha.map(p => p.name),
      });
    }
  }
  return warnings;
}

export async function discoverPlugins({ extraWorkspaces = [], externalOnly = false } = {}) {
  const plugins = [];

  if (!externalOnly) {
    let wsEntries;
    try {
      wsEntries = await readdir(WORKSPACES, { withFileTypes: true });
    } catch {
      wsEntries = [];
    }

    for (const wsEntry of wsEntries) {
      if (!wsEntry.isDirectory() || wsEntry.name.startsWith('.')) continue;
      const workspaceRoot = path.join(WORKSPACES, wsEntry.name);
      plugins.push(
        ...(await discoverPluginsInWorkspace(workspaceRoot, wsEntry.name, { external: false })),
      );
    }
  }

  for (const workspaceRoot of normalizeExtraWorkspaces(extraWorkspaces)) {
    if (!(await exists(workspaceRoot))) {
      console.warn(`WARNING: workspace not found, skipping: ${workspaceRoot}`);
      continue;
    }
    const wsLabel = `external:${path.basename(workspaceRoot)}`;
    plugins.push(
      ...(await discoverPluginsInWorkspace(workspaceRoot, wsLabel, {
        external: true,
        wsRoot: workspaceRoot,
      })),
    );
  }

  return plugins.sort((a, b) => a.name.localeCompare(b.name));
}

export function cliBundleSupport(cliPath, pluginDir) {
  if (!cliPath) return { ok: false, reason: 'no-cli' };
  const ver = spawnSync(cliPath, ['--version'], { encoding: 'utf8', cwd: pluginDir });
  const version = parseCliVersion(ver.stdout || ver.stderr || '');
  const help = spawnSync(cliPath, ['package', 'bundle', '--help'], {
    encoding: 'utf8',
    cwd: pluginDir,
  });
  const hasBundle = (help.stdout + help.stderr).includes('output-destination');
  if (!hasBundle) return { ok: false, reason: 'no-bundle-command', version };
  if (semverNum(version) < semverNum(MIN_BUNDLE_CLI_VERSION)) {
    return { ok: false, reason: 'cli-too-old', version };
  }
  return { ok: true, version };
}

const ALPHA_EXPOSE_NAMES = ['./alpha', 'alpha'];
const LEGACY_EXPOSE_NAMES = ['./legacy', 'legacy'];
const PRIMARY_EXPOSE_NAMES = ['.', './'];

function getExpose(byName, names) {
  for (const name of names) {
    const expose = byName.get(name);
    if (expose) return expose;
  }
  return null;
}

function getAlphaExpose(byName) {
  return getExpose(byName, ALPHA_EXPOSE_NAMES);
}

function bundledManifestCandidates(plugin, bundleDir) {
  const base = path.join(bundleDir, plugin.safeName);
  return [
    path.join(base, 'dist', 'dist', 'mf-manifest.json'),
    path.join(base, 'dist', 'mf-manifest.json'),
  ];
}

function manifestCandidates(plugin, bundleDir) {
  return [
    ...bundledManifestCandidates(plugin, bundleDir),
    path.join(plugin.pluginDir, 'dist', 'mf-manifest.json'),
    path.join(plugin.pluginDir, 'bundle', 'dist', 'dist', 'mf-manifest.json'),
    path.join(plugin.pluginDir, 'bundle', 'dist', 'mf-manifest.json'),
  ];
}

function bundleStatusPath(bundleDir) {
  return path.join(bundleDir, 'bundle-status.json');
}

async function saveBundleStatus(bundleDir, results) {
  const payload = {
    generatedAt: new Date().toISOString(),
    plugins: results.map(r => ({
      name: r.name,
      ws: r.ws,
      bundle: r.bundle,
      manifestPath: r.manifestPath ?? null,
    })),
  };
  await writeFile(bundleStatusPath(bundleDir), JSON.stringify(payload, null, 2));
}

async function loadBundleStatus(bundleDir) {
  const statusFile = bundleStatusPath(bundleDir);
  if (!(await exists(statusFile))) return new Map();
  try {
    const data = JSON.parse(await readFile(statusFile, 'utf8'));
    return new Map((data.plugins ?? []).map(p => [p.name, p.bundle]));
  } catch {
    return new Map();
  }
}

async function inferBundleStatus(plugin, bundleDir, manifestPath) {
  if (!manifestPath) return { status: 'not-run' };

  const bundledPath = await findBundledManifestPath(plugin, bundleDir);
  if (bundledPath && path.resolve(bundledPath) === path.resolve(manifestPath)) {
    const ageMs = Date.now() - (await stat(bundledPath)).mtimeMs;
    return { status: 'cached', manifest: bundledPath, ageMs };
  }

  if (manifestPath.startsWith(plugin.pluginDir)) {
    return { status: 'plugin-dist', manifest: manifestPath };
  }

  return { status: 'cached', manifest: manifestPath };
}

export async function bundlePlugin(plugin, bundleDir, options = {}) {
  const { forceBundle = false, maxAgeMs = DEFAULT_BUNDLE_CACHE_MS } = options;
  const dest = path.join(bundleDir, plugin.safeName);
  const cachedPath = await findBundledManifestPath(plugin, bundleDir);

  if (cachedPath && !forceBundle) {
    const ageMs = Date.now() - (await stat(cachedPath)).mtimeMs;
    if (ageMs <= maxAgeMs) {
      return { status: 'cached', manifest: cachedPath, ageMs };
    }
    const ageMin = Math.round(ageMs / 60_000);
    console.log(
      `mf-manifest.json stale for ${plugin.name} (${ageMin} min old, max ${Math.round(maxAgeMs / 60_000)} min), re-bundling...`,
    );
  } else if (cachedPath && forceBundle) {
    console.log(`Re-bundling ${plugin.name} (--force-bundle)...`);
  }

  const info = cliBundleSupport(plugin.cli, plugin.pluginDir);
  if (!info.ok) return { status: 'skipped', reason: info.reason, version: info.version };

  console.log(`Running backstage-cli package bundle for ${plugin.name}...`);
  await mkdir(dest, { recursive: true });
  const r = spawnSync(
    plugin.cli,
    ['package', 'bundle', '--output-destination', dest, '--output-name', 'dist', '--clean'],
    { encoding: 'utf8', cwd: plugin.pluginDir, maxBuffer: 30 * 1024 * 1024 },
  );
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || '').trim();
    const reason = err.includes('EACCES')
      ? 'permission-denied'
      : err.includes('unknown command')
        ? 'no-bundle-command'
        : 'bundle-failed';
    return { status: 'failed', reason, detail: err.split('\n').slice(-4).join(' ') };
  }
  const manifest = await findBundledManifestPath(plugin, bundleDir);
  return { status: 'ok', manifest };
}

function formatAgeMinutes(ageMs) {
  if (ageMs == null) return '';
  const mins = Math.round(ageMs / 60_000);
  return mins < 1 ? ', <1 min old' : `, ${mins} min old`;
}

function logBundleStatus(plugin, bundle) {
  const name = plugin.name;
  switch (bundle.status) {
    case 'ok':
      console.log(`mf-manifest.json generated for ${name}`);
      break;
    case 'cached':
      console.log(
        `mf-manifest.json already present for ${name} (cached${formatAgeMinutes(bundle.ageMs)})`,
      );
      break;
    case 'skipped':
      console.log(
        `skipped ${name}: ${bundle.reason ?? 'unknown'}${bundle.version ? ` (cli ${bundle.version})` : ''}`,
      );
      break;
    case 'failed':
      console.log(`bundle failed for ${name}: ${bundle.reason ?? 'unknown'}`);
      if (bundle.detail) console.log(`  ${bundle.detail}`);
      break;
    default:
      break;
  }
}

async function findBundledManifestPath(plugin, bundleDir) {
  for (const c of bundledManifestCandidates(plugin, bundleDir)) {
    if (await exists(c)) return c;
  }
  return null;
}

async function findManifest(plugin, bundleDir) {
  for (const c of manifestCandidates(plugin, bundleDir)) {
    if (await exists(c)) return c;
  }
  return null;
}

async function sizeOf(distDir, rel) {
  try {
    return (await stat(path.join(distDir, rel))).size;
  } catch {
    return 0;
  }
}

async function exposeStats(distDir, expose) {
  const syncPaths = [
    ...(expose.assets?.js?.sync ?? []),
    ...(expose.assets?.css?.sync ?? []),
  ];
  let syncBytes = 0;
  for (const p of syncPaths) syncBytes += await sizeOf(distDir, p);
  return {
    name: expose.name,
    syncCount: syncPaths.length,
    syncKb: syncBytes / 1024,
    asyncCount:
      (expose.assets?.js?.async?.length ?? 0) +
      (expose.assets?.css?.async?.length ?? 0),
    syncPaths,
  };
}

export async function analyzeManifest(manifestPath, plugin = {}) {
  const distDir = path.dirname(manifestPath);
  const manifest = await readJson(manifestPath);
  const byName = new Map();
  for (const expose of manifest.exposes ?? []) {
    byName.set(expose.name, await exposeStats(distDir, expose));
  }

  const layout = plugin.layout ?? 'classic';
  const translations = getAlphaExpose(byName);
  let nfs;
  let ofs;
  if (layout === 'graduated') {
    nfs = getExpose(byName, PRIMARY_EXPOSE_NAMES);
    ofs = getExpose(byName, LEGACY_EXPOSE_NAMES);
  } else {
    nfs = getAlphaExpose(byName);
    ofs = getExpose(byName, PRIMARY_EXPOSE_NAMES);
  }

  const nfsExposeName = nfs?.name ?? null;
  const ofsExposeName = ofs?.name ?? null;
  const translationsExposeName = translations?.name ?? null;

  return {
    layout,
    exposes: [...byName.keys()],
    nfsExposeName,
    ofsExposeName,
    translationsExposeName,
    nfs,
    ofs,
    translations,
    alphaExposeName: nfsExposeName,
    alpha: nfs,
    deltaSyncCount: nfs && ofs ? nfs.syncCount - ofs.syncCount : null,
    deltaSyncKb: nfs && ofs ? nfs.syncKb - ofs.syncKb : null,
    nfsOnlySync: nfs
      ? nfs.syncPaths.filter(p => !(ofs?.syncPaths ?? []).includes(p))
      : [],
    ofsOnlySync: ofs
      ? ofs.syncPaths.filter(p => !(nfs?.syncPaths ?? []).includes(p))
      : [],
    alphaOnlySync: nfs
      ? nfs.syncPaths.filter(p => !(ofs?.syncPaths ?? []).includes(p))
      : [],
  };
}

async function isAlphaShim(filePath) {
  if (!(await exists(filePath))) return false;
  const text = await readFile(filePath, 'utf8');
  return /import\s+\w+\s+from\s+['"]\.\/index['"]/.test(text) && text.split('\n').length < 25;
}

async function listNfsSources(plugin) {
  const files = new Set();
  const isTest = f => /\.(test|stories)\.(ts|tsx)$/.test(f);
  const nfsPath = plugin.nfsPath ?? plugin.alphaPath;
  if (nfsPath && (await exists(nfsPath)) && !isTest(nfsPath)) {
    files.add(nfsPath);
  }

  if (plugin.layout === 'graduated') {
    const srcDir = path.join(plugin.pluginDir, 'src');
    if (await exists(srcDir)) {
      for (const f of await walk(srcDir, x => /\.(ts|tsx)$/.test(x) && !isTest(x))) {
        if (plugin.legacyPath && path.resolve(f) === path.resolve(plugin.legacyPath)) continue;
        if (plugin.translationsPath && path.resolve(f) === path.resolve(plugin.translationsPath)) {
          if (await isAlphaShim(f)) continue;
        }
        files.add(f);
      }
    }
    return [...files].sort();
  }

  if (plugin.alphaPath && (await exists(plugin.alphaPath)) && !isTest(plugin.alphaPath)) {
    files.add(plugin.alphaPath);
  }
  const alphaSubDir = path.join(plugin.pluginDir, 'src', 'alpha');
  if (await exists(alphaSubDir)) {
    for (const f of await walk(alphaSubDir, x => /\.(ts|tsx)$/.test(x) && !isTest(x))) {
      files.add(f);
    }
  }
  return [...files].sort();
}

function classifyImport(spec, fileText, blueprintIds) {
  const findings = [];
  if (COMPONENTS_IMPORT_RE.test(spec)) {
    findings.push({
      severity: 'high',
      rule: 'static-component-import',
      message: `Static component import: ${spec}`,
    });
  }
  if (ICON_IMPORT_RE.test(spec)) {
    findings.push({
      severity:
        blueprintIds.includes('nav-item') || blueprintIds.includes('page-blueprint')
          ? 'medium'
          : 'high',
      rule: 'static-icon-import',
      message: `Static icon import: ${spec}`,
    });
  }
  if (HEAVY_UI_RE.test(spec)) {
    findings.push({
      severity: 'medium',
      rule: 'heavy-ui-import',
      message: `Heavy UI dependency: ${spec}`,
    });
  }
  if (LOADER_ASYNC_RE.test(fileText) && COMPONENTS_IMPORT_RE.test(spec)) {
    findings.push({
      severity: 'high',
      rule: 'static-in-async-loader',
      message:
        'Component statically imported but file defines async loader (closure pulls into sync)',
    });
  }
  return findings;
}

export async function analyzeStaticImports(plugin) {
  const sources = await listNfsSources(plugin);
  const nfsPath = plugin.nfsPath ?? plugin.alphaPath;
  const entryText =
    nfsPath && (await exists(nfsPath)) ? await readFile(nfsPath, 'utf8') : '';
  const hasDefaultExport = DEFAULT_EXPORT_RE.test(entryText);
  const allFindings = [];

  for (const file of sources) {
    const rel = path.relative(plugin.pluginDir, file);
    const text = await readFile(file, 'utf8');
    const blueprintIds = BLUEPRINT_PATTERNS.filter(p => p.re.test(text)).map(p => p.id);
    const imports = [...text.matchAll(IMPORT_RE)].map(m => m[1]);
    const findings = [];
    for (const spec of imports) findings.push(...classifyImport(spec, text, blueprintIds));

    if (
      blueprintIds.includes('app-root-element') ||
      blueprintIds.includes('app-root-wrapper')
    ) {
      for (const spec of imports.filter(
        i =>
          COMPONENTS_IMPORT_RE.test(i) ||
          i.startsWith('../components') ||
          i.startsWith('./components'),
      )) {
        findings.push({
          severity: 'high',
          rule: 'app-root-static-component',
          message: `App root blueprint with static component: ${spec}`,
        });
      }
    }

    for (const f of findings) allFindings.push({ ...f, file: rel });
  }

  return {
    hasDefaultExport,
    alphaEntry: nfsPath ? path.relative(plugin.pluginDir, nfsPath) : '',
    nfsEntry: nfsPath ? path.relative(plugin.pluginDir, nfsPath) : '',
    highCount: allFindings.filter(f => f.severity === 'high').length,
    findings: allFindings,
  };
}

function mdEsc(s) {
  return String(s).replace(/\|/g, '\\|');
}

export function formatReport(results, { workspaceWarnings = [] } = {}) {
  const lines = [];
  const graduatedCount = results.filter(r => r.layout === 'graduated').length;
  lines.push('# Module Federation: OFS vs NFS Sync Chunk Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(
    `Plugins inspected: ${results.length}` +
      (graduatedCount ? ` (${graduatedCount} graduated: NFS at \`./\`, OFS at \`./legacy\`)` : ''),
  );

  lines.push('');
  lines.push('## How to read this');
  lines.push('');
  lines.push('- **Classic layout** — NFS = federation expose `alpha` / `./alpha`; OFS = expose `.`');
  lines.push(
    '- **Graduated layout** — NFS = federation expose `.` (primary entry); OFS = expose `legacy` / `./legacy`; `./alpha` is translations-only',
  );
  lines.push('- **Δ sync#** = NFS sync chunks minus OFS sync chunks (positive = NFS loads more upfront)');
  lines.push('- Chunks that move from async (OFS) to sync (NFS) are the optimization targets');
  lines.push('');

  if (workspaceWarnings.length) {
    lines.push('## Workspaces skipped (no ./alpha inspection)');
    lines.push('');
    lines.push(
      'These `--workspace` paths were not included in bundle inspection. Plugins need `exports["./alpha"]` or `exports["./legacy"]` and `backstage.role` of `frontend-plugin` or `frontend-plugin-module`.',
    );
    lines.push('');
    for (const w of workspaceWarnings) {
      const label = `external:${path.basename(w.workspace)}`;
      lines.push(`- **${label}** — ${w.message}`);
      if (w.plugins?.length) {
        for (const name of w.plugins) lines.push(`  - \`${name}\``);
      }
    }
    lines.push('');
  }

  lines.push('## Summary');
  lines.push('');
  lines.push(
    '| Plugin | Workspace | Layout | NFS expose | OFS expose | OFS sync | OFS KB | NFS sync | NFS KB | Δ sync | Δ KB | High static | Bundle |',
  );
  lines.push('| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |');
  for (const r of results) {
    const m = r.manifest;
    const layout = r.layout ?? m?.layout ?? 'classic';
    const nfsExpose = m?.nfsExposeName ?? (m?.nfs ? 'yes' : 'no');
    const ofsExpose = m?.ofsExposeName ?? (m?.ofs ? 'yes' : layout === 'graduated' ? 'missing' : 'no');
    lines.push(
      `| ${mdEsc(r.name)} | ${mdEsc(r.ws)} | ${layout} | ${nfsExpose} | ${ofsExpose} | ${m?.ofs?.syncCount ?? '-'} | ${m?.ofs ? m.ofs.syncKb.toFixed(1) : '-'} | ${m?.nfs?.syncCount ?? '-'} | ${m?.nfs ? m.nfs.syncKb.toFixed(1) : '-'} | ${m?.deltaSyncCount ?? '-'} | ${m?.deltaSyncKb != null ? (m.deltaSyncKb >= 0 ? '+' : '') + m.deltaSyncKb.toFixed(1) : '-'} | ${r.static.highCount} | ${r.bundle.status} |`,
    );
  }
  lines.push('');

  const inflated = results
    .filter(r => (r.manifest?.deltaSyncCount ?? 0) > 0)
    .sort((a, b) => (b.manifest.deltaSyncKb ?? 0) - (a.manifest.deltaSyncKb ?? 0));

  if (inflated.length) {
    lines.push('## NFS sync inflation');
    lines.push('');
    for (const r of inflated) {
      const m = r.manifest;
      lines.push(`### ${r.name}`);
      lines.push(
        `- OFS (\`${m.ofsExposeName}\`): **${m.ofs.syncCount}** sync chunks (${m.ofs.syncKb.toFixed(1)} KB)`,
      );
      lines.push(
        `- NFS (\`${m.nfsExposeName}\`): **${m.nfs.syncCount}** sync chunks (${m.nfs.syncKb.toFixed(1)} KB)`,
      );
      lines.push(
        `- **Delta: +${m.deltaSyncCount} chunks (+${m.deltaSyncKb.toFixed(1)} KB)**`,
      );
      const nfsOnly = m.nfsOnlySync ?? m.alphaOnlySync ?? [];
      if (nfsOnly.length) {
        lines.push('- Chunks sync in NFS only (were likely async in OFS):');
        for (const p of nfsOnly.slice(0, 10)) lines.push(`  - \`${p}\``);
        if (nfsOnly.length > 10) {
          lines.push(`  - ... +${nfsOnly.length - 10} more`);
        }
      }
      lines.push('');
    }
  } else {
    lines.push('## NFS sync inflation');
    lines.push('');
    lines.push('_No plugins with both NFS and OFS exposes and NFS sync > OFS sync._');
    lines.push('');
  }

  const graduatedMissingLegacy = results.filter(
    r => r.layout === 'graduated' && r.manifest && !r.manifest.ofs,
  );
  if (graduatedMissingLegacy.length) {
    lines.push('## Graduated plugins: legacy expose not bundled');
    lines.push('');
    lines.push(
      'These plugins declare `exports["./legacy"]` for OFS, but `backstage-cli package bundle` did not emit a `legacy` federation expose in `mf-manifest.json`. OFS vs NFS comparison is unavailable until the CLI bundles `./legacy`.',
    );
    lines.push('');
    for (const r of graduatedMissingLegacy) {
      const m = r.manifest;
      const nfsKb = m?.nfs ? `${m.nfs.syncKb.toFixed(1)} KB` : '-';
      const transKb = m?.translations ? `${m.translations.syncKb.toFixed(1)} KB` : '-';
      lines.push(
        `- **${r.name}** — NFS (\`.\`) ${nfsKb}, translations (\`alpha\`) ${transKb}, manifest exposes: \`${m.exposes.join(', ')}\``,
      );
    }
    lines.push('');
  }

  const noNfsExpose = results.filter(r => r.manifest && !r.manifest.nfs);
  if (noNfsExpose.length) {
    lines.push('## Missing NFS federation expose in manifest');
    lines.push('');
    lines.push(
      'Bundled `mf-manifest.json` has no NFS expose. Classic plugins need `export default` on `./alpha`; graduated plugins need it on `./`.',
    );
    lines.push('');
    for (const r of noNfsExpose) {
      const exposeList = r.manifest.exposes.length ? r.manifest.exposes.join(', ') : '(none)';
      const entry = r.static.nfsEntry || r.static.alphaEntry;
      lines.push(
        `- **${r.name}** — \`${entry}\`, default export: ${r.static.hasDefaultExport ? 'yes' : '**no**'}, manifest exposes: \`${exposeList}\``,
      );
    }
    lines.push('');
  }

  const staticHits = results
    .filter(r => r.static.highCount > 0)
    .sort((a, b) => b.static.highCount - a.static.highCount);

  if (staticHits.length) {
    lines.push('## Static imports in NFS');
    lines.push('');
    lines.push('Known inflation patterns:');
    lines.push('');
    lines.push('1. **AppRootElementBlueprint** with static `import { Component }` (banner pattern)');
    lines.push('2. **NavItemBlueprint / PageBlueprint** with static MUI icon imports');
    lines.push('3. **Static import inside `loader: async` closure** (referenced binding still sync)');
    lines.push('4. **alpha/index.ts** statically importing all extension modules');
    lines.push('');
    for (const r of staticHits) {
      lines.push(`### ${r.name} (${r.static.highCount})`);
      for (const f of r.static.findings.filter(x => x.severity === 'high').slice(0, 15)) {
        lines.push(`- \`${f.file}\` — **${f.rule}**: ${f.message}`);
      }
      if (r.static.highCount > 15) lines.push(`- ... +${r.static.highCount - 15} more`);
      lines.push('');
    }
  }

  const fails = results.filter(r => ['failed', 'skipped'].includes(r.bundle.status));
  if (fails.length) {
    lines.push('## Bundle failures');
    lines.push('');
    for (const r of fails) {
      lines.push(
        `- **${r.name}** [${r.ws}]: ${r.bundle.status}${r.bundle.reason ? ` — ${r.bundle.reason}` : ''}${r.bundle.version ? ` (cli ${r.bundle.version})` : ''}${r.bundle.detail ? `\n  - ${r.bundle.detail}` : ''}`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

export async function runReport({
  bundleDir,
  doBundle,
  forceBundle = false,
  bundleCacheMs = DEFAULT_BUNDLE_CACHE_MS,
  extraWorkspaces = [],
  externalOnly = false,
}) {
  const workspaceWarnings = await discoverWorkspaceWarnings(extraWorkspaces);
  for (const w of workspaceWarnings) {
    const label = `external:${path.basename(w.workspace)}`;
    console.warn(`WARNING: ${label}: ${w.message}`);
    if (w.plugins?.length) {
      for (const name of w.plugins) console.warn(`  - ${name}`);
    }
  }

  const plugins = await discoverPlugins({ extraWorkspaces, externalOnly });
  const results = [];
  const savedBundleStatus = doBundle ? new Map() : await loadBundleStatus(bundleDir);

  if (doBundle) {
    await mkdir(bundleDir, { recursive: true });
    const cacheMins = Math.round(bundleCacheMs / 60_000);
    const externalNote = extraWorkspaces.length
      ? `, ${extraWorkspaces.length} external workspace${extraWorkspaces.length === 1 ? '' : 's'}`
      : '';
    const scopeNote = externalOnly ? ' (external-only)' : '';
    console.log(
      `Bundling ${plugins.length} frontend plugins with ./alpha export${externalNote}${scopeNote}...` +
        (forceBundle ? ' (--force-bundle)' : ` (cache TTL: ${cacheMins} min)`),
    );
  }

  for (const plugin of plugins) {
    let bundle = savedBundleStatus.get(plugin.name) ?? { status: 'not-run' };
    if (doBundle) {
      console.log(`--- ${plugin.name} [${plugin.ws}]`);
      bundle = await bundlePlugin(plugin, bundleDir, { forceBundle, maxAgeMs: bundleCacheMs });
      logBundleStatus(plugin, bundle);
    }

    const manifestPath = await findManifest(plugin, bundleDir);
    if (!doBundle) {
      if (bundle.status === 'not-run') {
        bundle = await inferBundleStatus(plugin, bundleDir, manifestPath);
      }
      if (manifestPath) {
        console.log(`Using existing mf-manifest.json for ${plugin.name}`);
      }
    } else if (bundle.status === 'failed' && manifestPath) {
      console.log(`Using fallback mf-manifest.json for ${plugin.name}`);
    }

    const manifest = manifestPath ? await analyzeManifest(manifestPath, plugin) : null;
    const staticAnalysis = await analyzeStaticImports(plugin);

    results.push({
      name: plugin.name,
      ws: plugin.ws,
      wsRoot: plugin.wsRoot,
      external: plugin.external,
      layout: plugin.layout,
      bundle,
      manifest,
      manifestPath,
      static: staticAnalysis,
    });
  }

  return { results, workspaceWarnings };
}

// CLI entry when run directly
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);

  if (args.includes('--list-alpha-workspaces')) {
    const extraWorkspaces = normalizeExtraWorkspaces(collectFlagValues(args, '--workspace'));
    const externalOnly = args.includes('--external-only');
    const workspaces = await discoverAlphaWorkspaces({ extraWorkspaces, externalOnly });
    for (const ws of workspaces) console.log(ws);
    process.exit(0);
  }

  const extraWorkspaces = normalizeExtraWorkspaces(collectFlagValues(args, '--workspace'));
  const externalOnly = args.includes('--external-only');
  const bundleDir = args.includes('--bundle-dir')
    ? path.resolve(args[args.indexOf('--bundle-dir') + 1])
    : path.join(ROOT, '.mf-sync-report');
  const bundleOnly = args.includes('--bundle-only');
  const doBundle = args.includes('--bundle') || bundleOnly;
  const forceBundle = args.includes('--force-bundle');
  const bundleCacheMs = args.includes('--bundle-cache-mins')
    ? Number(args[args.indexOf('--bundle-cache-mins') + 1]) * 60_000
    : DEFAULT_BUNDLE_CACHE_MS;
  const output = args.includes('--output') ? args[args.indexOf('--output') + 1] : null;
  const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;

  const { results, workspaceWarnings } = await runReport({
    bundleDir,
    doBundle,
    forceBundle,
    bundleCacheMs,
    extraWorkspaces,
    externalOnly,
  });
  if (doBundle) {
    const ok = results.filter(r => r.bundle.status === 'ok').length;
    const cached = results.filter(r => r.bundle.status === 'cached').length;
    const failed = results.filter(r => r.bundle.status === 'failed').length;
    const skipped = results.filter(r => r.bundle.status === 'skipped').length;
    console.log(
      `Bundle complete: ${ok} generated, ${cached} cached, ${failed} failed, ${skipped} skipped`,
    );
    await saveBundleStatus(bundleDir, results);
  }

  if (bundleOnly) {
    process.exit(0);
  }

  const report = formatReport(results, { workspaceWarnings });

  if (output) {
    await writeFile(output, report);
    console.log(`Wrote ${output}`);
  } else {
    console.log(report);
  }
  if (jsonOut) {
    await writeFile(jsonOut, JSON.stringify({ results, workspaceWarnings }, null, 2));
    console.log(`Wrote ${jsonOut}`);
  }
}
