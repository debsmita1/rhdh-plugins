# Dynamic Home Page plugin

This is a dynamic version of the upstream [home page plugin](https://github.com/backstage/backstage/tree/master/plugins/home).

Instead of manually adding supported "home page cards" to a custom route, it allows dynamic plugins to expose such cards. The plugin supports both the **New Frontend System (NFS)** and the **legacy** dynamic plugin model (Scalprum).

## New Frontend System

The homepage package is its **own** frontend plugin (`pluginId: homepage`) with its own page (`page:homepage`). It works **without** community `@backstage/plugin-home`.

Widgets/layout attach to `page:homepage`. Persona-based defaults (`homepage.defaultWidgets` with `if` / `unless` / `tags`) are applied in the NFS layout the same way as legacy.

```tsx
// packages/app/src/App.tsx
import { createApp } from '@backstage/frontend-defaults';
import {
  homepagePlugin,
  homepageHomeModule, // optional: only if community home is also installed
  homepageTranslationsModule,
} from '@red-hat-developer-hub/backstage-plugin-homepage/alpha';

export default createApp({
  features: [
    homepagePlugin,
    homepageTranslationsModule,
    // homepageHomeModule, // optional when using community home alongside
  ],
});
```

### Configuration

```yaml
app:
  extensions:
    # Disable community home when using homepage alone (avoids two home pages)
    - page:home: false

    # Homepage-owned route (configurable)
    - page:homepage:
        config:
          path: / # or /home, /start, etc.

    # Optional: disable homepage instead of community home
    # - page:homepage: false

    - home-page-layout:homepage/dynamic-homepage-layout:
        config:
          customizable: true
          widgetLayout:
            # keys match widget `name` / layout config
            ...
```

Visit tracking (for recently/top visited) still uses community home APIs when that package is installed:

```yaml
app:
  extensions:
    - api:home/visits: true
    - app-root-element:home/visit-listener: true
```

### Plugins / modules

| Export                       | Type             | Description                                                                 |
| ---------------------------- | ---------------- | --------------------------------------------------------------------------- |
| `homepagePlugin` (default)   | `FrontendPlugin` | Own plugin with `page:homepage` + widgets/layout/APIs.                      |
| `homepageHomeModule`         | `FrontendModule` | Optional: disable community home toolkit/joke/starred when both are loaded. |
| `homepageTranslationsModule` | `FrontendModule` | i18n translations                                                           |

### Extensions

- `page:homepage` – Homepage route (config: `path`)
- `home-page-layout:homepage/dynamic-homepage-layout`
- `home-page-widget:homepage/...` – Onboarding, Entity, Templates, Quick Access, Search, Featured docs, Recently/Top visited, Catalog starred
- `api:homepage/quickaccess`, `api:homepage/default-widgets`

## Legacy System (Dynamic Plugins)

See [docs](https://github.com/redhat-developer/rhdh-plugins/tree/main/workspaces/homepage/docs).
