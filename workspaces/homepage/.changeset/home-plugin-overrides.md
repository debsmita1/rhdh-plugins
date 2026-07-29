---
'@red-hat-developer-hub/backstage-plugin-homepage': minor
---

Give the homepage NFS plugin its own configurable page (`page:homepage`) so it works without community `@backstage/plugin-home`, and apply persona-based `homepage.defaultWidgets` filtering (`if` / `unless` / `tags`) in the NFS layout. Community `page:home` and `page:homepage` can be enabled or disabled independently via app-config.
