# Module Federation: OFS vs NFS Sync Chunk Report

Generated: 2026-07-15T13:40:57.125Z
Plugins inspected: 19 (2 graduated: NFS at `./`, OFS at `./legacy`)

## How to read this

- **Classic layout** — NFS = federation expose `alpha` / `./alpha`; OFS = expose `.`
- **Graduated layout** — NFS = federation expose `.` (primary entry); OFS = expose `legacy` / `./legacy`; `./alpha` is translations-only
- **Δ sync#** = NFS sync chunks minus OFS sync chunks (positive = NFS loads more upfront)
- Chunks that move from async (OFS) to sync (NFS) are the optimization targets

## Summary

| Plugin                                                                     | Workspace         | Layout    | NFS expose | OFS expose | OFS sync | OFS KB | NFS sync | NFS KB | Δ sync |    Δ KB | High static | Bundle |
| -------------------------------------------------------------------------- | ----------------- | --------- | ---------- | ---------- | -------: | -----: | -------: | -----: | -----: | ------: | ----------: | ------ |
| @red-hat-developer-hub/backstage-plugin-adoption-insights                  | adoption-insights | classic   | alpha      | .          |        3 |  156.5 |        4 |  244.3 |      1 |   +87.8 |           0 | ok     |
| @red-hat-developer-hub/backstage-plugin-analytics-module-adoption-insights | adoption-insights | classic   | alpha      | .          |        1 |    4.5 |        2 |   89.5 |      1 |   +85.0 |           0 | ok     |
| @red-hat-developer-hub/backstage-plugin-app-auth                           | app-defaults      | classic   | alpha      | .          |        1 |    0.3 |        4 | 1472.9 |      3 | +1472.6 |           0 | ok     |
| @red-hat-developer-hub/backstage-plugin-app-integrations                   | app-defaults      | classic   | alpha      | .          |        1 |    0.3 |        2 |  226.3 |      1 |  +226.0 |           0 | ok     |
| @red-hat-developer-hub/backstage-plugin-bcc-test                           | theme             | classic   | alpha      | .          |        2 |   44.0 |        3 |  127.9 |      1 |   +83.8 |           0 | ok     |
| @red-hat-developer-hub/backstage-plugin-bui-test                           | theme             | classic   | alpha      | .          |        2 |   43.4 |        4 |  131.1 |      2 |   +87.7 |           0 | ok     |
| @red-hat-developer-hub/backstage-plugin-bulk-import                        | bulk-import       | classic   | alpha      | .          |        4 |  380.0 |        5 |  467.6 |      1 |   +87.5 |           1 | ok     |
| @red-hat-developer-hub/backstage-plugin-extensions                         | extensions        | classic   | alpha      | .          |        3 |  102.6 |        4 |  246.6 |      1 |  +144.1 |           0 | ok     |
| @red-hat-developer-hub/backstage-plugin-global-header                      | global-header     | classic   | alpha      | .          |        5 | 1049.2 |        5 | 1041.3 |      0 |    -7.9 |          32 | ok     |
| @red-hat-developer-hub/backstage-plugin-homepage                           | homepage          | classic   | alpha      | .          |        2 |   26.6 |       11 |  784.5 |      9 |  +757.9 |           1 | ok     |
| @red-hat-developer-hub/backstage-plugin-lightspeed                         | lightspeed        | graduated | .          | legacy†    |        6 | 3678.2 |        6 | 3773.6 |      0 |   +95.4 |          26 | ok     |
| @red-hat-developer-hub/backstage-plugin-mui4-test                          | theme             | classic   | alpha      | .          |        2 |   44.0 |        3 |  127.8 |      1 |   +83.8 |           0 | ok     |
| @red-hat-developer-hub/backstage-plugin-mui5-test                          | theme             | classic   | alpha      | .          |        2 |   44.0 |        3 |  127.8 |      1 |   +83.9 |           0 | ok     |
| @red-hat-developer-hub/backstage-plugin-orchestrator                       | orchestrator      | classic   | alpha      | .          |        4 | 1597.2 |        4 |  544.5 |      0 | -1052.7 |           1 | ok     |
| @red-hat-developer-hub/backstage-plugin-orchestrator-form-widgets          | orchestrator      | classic   | alpha      | .          |        4 |  921.3 |        5 | 1006.8 |      1 |   +85.5 |           0 | ok     |
| @red-hat-developer-hub/backstage-plugin-quickstart                         | quickstart        | graduated | .          | legacy†    |        3 |  170.9 |        4 |  464.8 |      1 |  +293.9 |          17 | ok     |
| @red-hat-developer-hub/backstage-plugin-scorecard                          | scorecard         | classic   | alpha      | .          |        4 |   95.2 |        6 | 1041.6 |      2 |  +946.5 |           0 | ok     |
| @red-hat-developer-hub/backstage-plugin-theme                              | theme             | classic   | alpha      | .          |        4 |  143.1 |        5 |  218.8 |      1 |   +75.6 |           0 | ok     |
| @red-hat-developer-hub/backstage-plugin-translations                       | translations      | classic   | no         | .          |        2 |   85.9 |        - |      - |      - |       - |           0 | ok     |

## NFS sync inflation

### @red-hat-developer-hub/backstage-plugin-app-auth

- OFS (`.`): **1** sync chunks (0.3 KB)
- NFS (`alpha`): **4** sync chunks (1472.9 KB)
- **Delta: +3 chunks (+1472.6 KB)**
- Chunks sync in NFS only (were likely async in OFS):
  - `static/7145.666d0b8d.chunk.js`
  - `static/6573.9a19e289.chunk.js`
  - `static/9728.eaba184f.chunk.js`
  - `static/__federation_expose_alpha.d68537dc.chunk.js`

### @red-hat-developer-hub/backstage-plugin-scorecard

- OFS (`.`): **4** sync chunks (95.2 KB)
- NFS (`alpha`): **6** sync chunks (1041.6 KB)
- **Delta: +2 chunks (+946.5 KB)**
- Chunks sync in NFS only (were likely async in OFS):
  - `static/8088.3b73a673.chunk.js`
  - `static/1122.c72dcdca.chunk.js`
  - `static/4033.7dabeeaa.chunk.js`
  - `static/3239.6704a44e.chunk.js`
  - `static/__federation_expose_alpha.d7492617.chunk.js`

### @red-hat-developer-hub/backstage-plugin-homepage

- OFS (`.`): **2** sync chunks (26.6 KB)
- NFS (`alpha`): **11** sync chunks (784.5 KB)
- **Delta: +9 chunks (+757.9 KB)**
- Chunks sync in NFS only (were likely async in OFS):
  - `static/8088.6af4d402.chunk.js`
  - `static/4741.a71854dd.chunk.js`
  - `static/2218.f32d2abb.chunk.js`
  - `static/3479.c52c1fb6.chunk.js`
  - `static/4233.93160f7f.chunk.js`
  - `static/1103.585959f6.chunk.js`
  - `static/5956.fb828b21.chunk.js`
  - `static/4619.45e205ae.chunk.js`
  - `static/9900.ae383738.chunk.js`
  - `static/__federation_expose_alpha.c42bce1b.chunk.js`

### @red-hat-developer-hub/backstage-plugin-app-integrations

- OFS (`.`): **1** sync chunks (0.3 KB)
- NFS (`alpha`): **2** sync chunks (226.3 KB)
- **Delta: +1 chunks (+226.0 KB)**
- Chunks sync in NFS only (were likely async in OFS):
  - `static/216.0722df8a.chunk.js`
  - `static/__federation_expose_alpha.257fa929.chunk.js`

### @red-hat-developer-hub/backstage-plugin-extensions

- OFS (`.`): **3** sync chunks (102.6 KB)
- NFS (`alpha`): **4** sync chunks (246.6 KB)
- **Delta: +1 chunks (+144.1 KB)**
- Chunks sync in NFS only (were likely async in OFS):
  - `static/9373.8213f2b4.chunk.js`
  - `static/__federation_expose_alpha.9e99f954.chunk.js`

### @red-hat-developer-hub/backstage-plugin-adoption-insights

- OFS (`.`): **3** sync chunks (156.5 KB)
- NFS (`alpha`): **4** sync chunks (244.3 KB)
- **Delta: +1 chunks (+87.8 KB)**
- Chunks sync in NFS only (were likely async in OFS):
  - `static/5096.51f958eb.chunk.js`
  - `static/__federation_expose_alpha.d3e53b12.chunk.js`

### @red-hat-developer-hub/backstage-plugin-bui-test

- OFS (`.`): **2** sync chunks (43.4 KB)
- NFS (`alpha`): **4** sync chunks (131.1 KB)
- **Delta: +2 chunks (+87.7 KB)**
- Chunks sync in NFS only (were likely async in OFS):
  - `static/242.a260ed71.chunk.js`
  - `static/545.2c431a5c.chunk.js`
  - `static/__federation_expose_alpha.35be3c9a.chunk.js`

### @red-hat-developer-hub/backstage-plugin-bulk-import

- OFS (`.`): **4** sync chunks (380.0 KB)
- NFS (`alpha`): **5** sync chunks (467.6 KB)
- **Delta: +1 chunks (+87.5 KB)**
- Chunks sync in NFS only (were likely async in OFS):
  - `static/3451.c8145ab3.chunk.js`
  - `static/__federation_expose_alpha.facc961f.chunk.js`

### @red-hat-developer-hub/backstage-plugin-orchestrator-form-widgets

- OFS (`.`): **4** sync chunks (921.3 KB)
- NFS (`alpha`): **5** sync chunks (1006.8 KB)
- **Delta: +1 chunks (+85.5 KB)**
- Chunks sync in NFS only (were likely async in OFS):
  - `static/49.2b340115.chunk.js`
  - `static/__federation_expose_alpha.f2f29a8d.chunk.js`

### @red-hat-developer-hub/backstage-plugin-analytics-module-adoption-insights

- OFS (`.`): **1** sync chunks (4.5 KB)
- NFS (`alpha`): **2** sync chunks (89.5 KB)
- **Delta: +1 chunks (+85.0 KB)**
- Chunks sync in NFS only (were likely async in OFS):
  - `static/698.33245e3b.chunk.js`
  - `static/__federation_expose_alpha.20043fe6.chunk.js`

### @red-hat-developer-hub/backstage-plugin-mui5-test

- OFS (`.`): **2** sync chunks (44.0 KB)
- NFS (`alpha`): **3** sync chunks (127.8 KB)
- **Delta: +1 chunks (+83.9 KB)**
- Chunks sync in NFS only (were likely async in OFS):
  - `static/2404.94ad48c0.chunk.js`
  - `static/__federation_expose_alpha.ad7f8d8f.chunk.js`

### @red-hat-developer-hub/backstage-plugin-mui4-test

- OFS (`.`): **2** sync chunks (44.0 KB)
- NFS (`alpha`): **3** sync chunks (127.8 KB)
- **Delta: +1 chunks (+83.8 KB)**
- Chunks sync in NFS only (were likely async in OFS):
  - `static/2404.1b07d7f8.chunk.js`
  - `static/__federation_expose_alpha.a819aa93.chunk.js`

### @red-hat-developer-hub/backstage-plugin-bcc-test

- OFS (`.`): **2** sync chunks (44.0 KB)
- NFS (`alpha`): **3** sync chunks (127.9 KB)
- **Delta: +1 chunks (+83.8 KB)**
- Chunks sync in NFS only (were likely async in OFS):
  - `static/2404.618be9f8.chunk.js`
  - `static/__federation_expose_alpha.acb738eb.chunk.js`

### @red-hat-developer-hub/backstage-plugin-theme

- OFS (`.`): **4** sync chunks (143.1 KB)
- NFS (`alpha`): **5** sync chunks (218.8 KB)
- **Delta: +1 chunks (+75.6 KB)**
- Chunks sync in NFS only (were likely async in OFS):
  - `static/867.e50c0e56.chunk.js`
  - `static/__federation_expose_alpha.1d72b96d.chunk.js`
  - `static/__federation_expose_alpha.629.e5d80252.css`

## Graduated plugins: legacy OFS comparison (manual bundle)

† `legacy` is not emitted in the main `mf-manifest.json` by `backstage-cli package bundle` yet. OFS sizes below come from a **secondary legacy-only bundle** (`exports["."]` → `./legacy`).

| Plugin                                             |       OFS (`legacy`) |            NFS (`.`) | Δ sync |   Δ KB |
| -------------------------------------------------- | -------------------: | -------------------: | -----: | -----: |
| @red-hat-developer-hub/backstage-plugin-quickstart |  3 chunks / 170.9 KB |  4 chunks / 464.8 KB |     +1 | +293.9 |
| @red-hat-developer-hub/backstage-plugin-lightspeed | 6 chunks / 3678.2 KB | 6 chunks / 3773.6 KB |      0 |  +95.4 |

### @red-hat-developer-hub/backstage-plugin-quickstart

- OFS (`legacy`): **3** sync chunks (170.9 KB)
- NFS (`.`): **4** sync chunks (464.8 KB)
- **Delta: +1 chunks (+293.9 KB)**
- Chunks sync in NFS only:
  - `static/404.7fbcbc37.chunk.js`
  - `static/605.30ac0524.chunk.js`
  - `static/243.e899cd34.chunk.js`
  - `static/__federation_expose_default_export.de82f3ab.chunk.js`
- Legacy bundle: `/tmp/quickstart-legacy-bundle`

### @red-hat-developer-hub/backstage-plugin-lightspeed

- OFS (`legacy`): **6** sync chunks (3678.2 KB)
- NFS (`.`): **6** sync chunks (3773.6 KB)
- **Delta: +0 chunks (+95.4 KB)**
- Chunks sync in NFS only:
  - `static/7709.3d74caeb.chunk.js`
  - `static/__federation_expose_default_export.836bf385.chunk.js`
  - `static/7709.7709.4c617f2a.css`
- Legacy bundle: `/tmp/lightspeed-legacy-bundle`

Full JSON: `mf-sync-report-graduated-legacy.json`

## Missing NFS federation expose in manifest

Bundled `mf-manifest.json` has no NFS expose. Classic plugins need `export default` on `./alpha`; graduated plugins need it on `./`.

- **@red-hat-developer-hub/backstage-plugin-translations** — `src/alpha.ts`, default export: **no**, manifest exposes: `.`

## Static imports in NFS

Known inflation patterns:

1. **AppRootElementBlueprint** with static `import { Component }` (banner pattern)
2. **NavItemBlueprint / PageBlueprint** with static MUI icon imports
3. **Static import inside `loader: async` closure** (referenced binding still sync)
4. **alpha/index.ts** statically importing all extension modules

### @red-hat-developer-hub/backstage-plugin-global-header (32)

- `src/alpha/components/ApplicationLauncherDropdown.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/Apps
- `src/alpha/components/ApplicationLauncherDropdown.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/AppRegistration
- `src/alpha/components/ApplicationLauncherDropdown.tsx` — **static-component-import**: Static component import: ../../components/HeaderDropdownComponent/DropdownEmptyState
- `src/alpha/components/GlobalHeaderDropdown.tsx` — **static-component-import**: Static component import: ../../components/HeaderDropdownComponent/HeaderDropdownComponent
- `src/alpha/components/GlobalHeaderDropdownContent.tsx` — **static-component-import**: Static component import: ../../components/HeaderDropdownComponent/MenuSection
- `src/alpha/components/GlobalHeaderMenuItem.tsx` — **static-component-import**: Static component import: ../../components/MenuItemLink/MenuItemLink
- `src/alpha/components/HelpDropdown.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/HelpOutline
- `src/alpha/components/HelpDropdown.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/SupportAgent
- `src/alpha/components/HelpDropdown.tsx` — **static-component-import**: Static component import: ../../components/HeaderDropdownComponent/DropdownEmptyState
- `src/alpha/components/MyProfileMenuItem.tsx` — **static-component-import**: Static component import: ../../components/MenuItemLink/MenuItemLinkContent
- `src/alpha/components/ProfileDropdown.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/AccountCircleOutlined
- `src/alpha/components/ProfileDropdown.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/KeyboardArrowDownOutlined
- `src/alpha/defaults/menuItemExtensions.tsx` — **static-component-import**: Static component import: ../../components/LogoutButton/LogoutButton
- `src/alpha/defaults/menuItemExtensions.tsx` — **static-component-import**: Static component import: ../../components/SupportButton/SupportButton
- `src/alpha/defaults/menuItemExtensions.tsx` — **static-component-import**: Static component import: ../components/MyProfileMenuItem
- ... +17 more

### @red-hat-developer-hub/backstage-plugin-lightspeed (26)

- `src/components/LightspeedChatBoxHeader.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/ToggleOffOutlined
- `src/components/LightspeedChatBoxHeader.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/ToggleOnOutlined
- `src/components/LightspeedChatContainer.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/OpenInNew
- `src/components/LightspeedChatModelsState.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/ErrorOutline
- `src/components/LightspeedChatModelsState.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/OpenInNew
- `src/components/LightspeedChatModelsState.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/SmartToyOutlined
- `src/components/McpServersSettings.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/CancelOutlined
- `src/components/McpServersSettings.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/CloseOutlined
- `src/components/RenameConversationModal.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/CancelOutlined
- `src/components/RenameConversationModal.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/Close
- `src/components/notebooks/AddDocumentModal.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/Close
- `src/components/notebooks/DeleteDocumentModal.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/Close
- `src/components/notebooks/DeleteNotebookModal.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/Close
- `src/components/notebooks/FileListItem.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/Close
- `src/components/notebooks/OverwriteConfirmModal.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/Close
- ... +11 more

### @red-hat-developer-hub/backstage-plugin-quickstart (17)

- `src/QuickstartDrawerContent.tsx` — **static-component-import**: Static component import: ./components/Quickstart
- `src/QuickstartInit.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/Close
- `src/components/QuickstartButton/QuickstartButton.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/WavingHandOutlined
- `src/components/QuickstartContent/QuickstartCtaLink.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/OpenInNew
- `src/components/QuickstartContent/QuickstartItem.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/ExpandLess
- `src/components/QuickstartContent/QuickstartItem.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/ExpandMore
- `src/components/QuickstartContent/QuickstartItemIcon.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/AdminPanelSettingsOutlined
- `src/components/QuickstartContent/QuickstartItemIcon.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/VpnKeyOutlined
- `src/components/QuickstartContent/QuickstartItemIcon.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/FileCopyOutlined
- `src/components/QuickstartContent/QuickstartItemIcon.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/PowerOutlined
- `src/components/QuickstartContent/QuickstartItemIcon.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/Login
- `src/components/QuickstartContent/QuickstartItemIcon.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/CategoryOutlined
- `src/components/QuickstartContent/QuickstartItemIcon.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/ControlPointOutlined
- `src/components/QuickstartContent/QuickstartItemIcon.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/SchoolOutlined
- `src/components/QuickstartDrawerProvider.tsx` — **static-icon-import**: Static icon import: @mui/icons-material/Close
- ... +2 more

### @red-hat-developer-hub/backstage-plugin-bulk-import (1)

- `src/alpha.tsx` — **static-component-import**: Static component import: ./components/BulkImportIcon

### @red-hat-developer-hub/backstage-plugin-homepage (1)

- `src/alpha/components/HomePageLayout.tsx` — **static-component-import**: Static component import: ../../components/Header

### @red-hat-developer-hub/backstage-plugin-orchestrator (1)

- `src/alpha.tsx` — **static-component-import**: Static component import: ./components/OrchestratorIcon
