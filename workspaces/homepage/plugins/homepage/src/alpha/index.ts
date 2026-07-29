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

import { TranslationBlueprint } from '@backstage/plugin-app-react';
import {
  createFrontendModule,
  createFrontendPlugin,
} from '@backstage/frontend-plugin-api';
import {
  catalogStarredWidget,
  disableRandomJoke,
  disableToolkit,
  entitySectionWidget,
  featuredDocsCardWidget,
  onboardingSectionWidget,
  overrideHomeCatalogStarredWidget,
  quickAccessCardWidget,
  RecentlyVisitedWidget,
  searchBarWidget,
  templateSectionWidget,
  TopVisitedWidget,
} from './extensions/homePageCards';
import { homepageTranslations } from '../translations';

import { homePageLayoutExtension } from './extensions/homePageLayoutExtension';
import { homepagePage, homepageRouteRef } from './extensions/homepagePage';
import { defaultWidgetsApi, quickAccessApi } from './extensions/apis';

/**
 * Extensions owned by the homepage plugin.
 *
 * Widgets/layout attach to `page:homepage` (this plugin's page), so the
 * homepage works without community `@backstage/plugin-home`.
 */
const homepageExtensions = [
  homepagePage,
  homePageLayoutExtension,
  onboardingSectionWidget,
  entitySectionWidget,
  templateSectionWidget,
  defaultWidgetsApi,
  quickAccessApi,
  quickAccessCardWidget,
  featuredDocsCardWidget,
  searchBarWidget,
  TopVisitedWidget,
  RecentlyVisitedWidget,
  catalogStarredWidget,
];

/**
 * Homepage frontend plugin (`pluginId: homepage`).
 *
 * Provides its own configurable page (`page:homepage`, default path `/`) plus
 * widgets/layout. Install without community home, or alongside it and disable
 * one of the pages via app-config (`page:home: false` / `page:homepage: false`).
 *
 * @alpha
 */
export const homepagePlugin = createFrontendPlugin({
  pluginId: 'homepage',
  extensions: homepageExtensions,
  routes: {
    root: homepageRouteRef,
  },
});

/**
 * Optional module that mutates community `home` extensions when both plugins
 * are installed (disable toolkit/joke/community starred).
 *
 * @alpha
 */
export const homepageHomeModule = createFrontendModule({
  pluginId: 'home',
  extensions: [
    overrideHomeCatalogStarredWidget,
    disableToolkit,
    disableRandomJoke,
  ],
});

/**
 * @alpha
 * @deprecated Use {@link homepageHomeModule}.
 */
export { homepageHomeModule as homePageModule };

/**
 * @alpha
 * @deprecated Use {@link homepagePlugin}.
 */
export { homepagePlugin as homePagePlugin };

/**
 * Translation module for the Dynamic Home Page plugin.
 *
 * @alpha
 */
export const homepageTranslationsModule = createFrontendModule({
  pluginId: 'app',
  extensions: [
    TranslationBlueprint.make({
      name: 'homepage-translations',
      params: {
        resource: homepageTranslations,
      },
    }),
  ],
});

/**
 *
 * @alpha
 */
export { homepageTranslationRef, homepageTranslations } from '../translations';

export { homepageRouteRef } from './extensions/homepagePage';

/**
 * Default export for Module Federation `alpha` NFS expose.
 *
 * Registers `page:homepage` (configurable path). Community home is optional.
 *
 * @alpha
 */
export default homepagePlugin;
