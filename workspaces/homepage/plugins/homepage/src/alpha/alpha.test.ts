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

import homePlugin from '@backstage/plugin-home/alpha';
import homepageAlpha, {
  homepageHomeModule,
  homepagePlugin,
  homepageTranslationsModule,
  homePageModule,
  homePagePlugin,
} from '.';
import { homepageTranslationRef, homepageTranslations } from '../translations';
import { homePageLayoutExtension } from './extensions/homePageLayoutExtension';
import { HOMEPAGE_PAGE_ID } from './extensions/homepageAttach';
import {
  onboardingSectionWidget,
  entitySectionWidget,
  templateSectionWidget,
  quickAccessCardWidget,
  searchBarWidget,
  featuredDocsCardWidget,
  catalogStarredWidget,
  disableRandomJoke,
  disableToolkit,
  RecentlyVisitedWidget,
  TopVisitedWidget,
} from './extensions/homePageCards';
import { quickAccessApi } from './extensions/apis';

type ExtensionAttach = { id: string; input: string };

type RuntimeExtension = {
  id: string;
  attachTo?: ExtensionAttach;
};

/** Runtime-only: public NFS types do not expose `.extensions`. */
function getRuntimeExtensions(feature: object): RuntimeExtension[] {
  const extensions = (feature as { extensions?: RuntimeExtension[] })
    .extensions;
  expect(extensions).toBeDefined();
  return extensions!;
}

function getAttachTo(extension: RuntimeExtension): ExtensionAttach {
  expect(extension.attachTo).toBeDefined();
  return extension.attachTo!;
}

describe('Dynamic Home Page plugin Alpha (NFS)', () => {
  describe('Install models', () => {
    it('homepagePlugin owns page:homepage with widgets attached to it', () => {
      expect(homepagePlugin).toBeDefined();
      expect(homepagePlugin.$$type).toBe('@backstage/FrontendPlugin');
      expect(homepagePlugin.id).toBe('homepage');
      expect(homepagePlugin.id).not.toBe(homePlugin.id);
      expect(homepageAlpha).toBe(homepagePlugin);
      expect(homePagePlugin).toBe(homepagePlugin);
      expect(homepagePlugin.getExtension(HOMEPAGE_PAGE_ID)).toBeDefined();
      expect(
        homepagePlugin.getExtension(
          'home-page-widget:homepage/rhdh-onboarding-section',
        ),
      ).toBeDefined();
      expect(
        homepagePlugin.getExtension(
          'home-page-layout:homepage/dynamic-homepage-layout',
        ),
      ).toBeDefined();
      expect(
        getRuntimeExtensions(homepagePlugin).some(
          ext => ext.id === 'page:home',
        ),
      ).toBe(false);
    });

    it('homepageHomeModule only overrides community home widgets', () => {
      expect(homepageHomeModule).toBeDefined();
      expect(homepageHomeModule.$$type).toBe('@backstage/FrontendModule');
      expect(homepageHomeModule.pluginId).toBe('home');
      expect(homePageModule).toBe(homepageHomeModule);

      const ids = getRuntimeExtensions(homepageHomeModule).map(ext => ext.id);
      expect(ids).toEqual(
        expect.arrayContaining([
          'home-page-widget:home/starred-entities',
          'home-page-widget:home/toolkit',
          'home-page-widget:home/random-joke',
        ]),
      );
      expect(ids).not.toContain(
        'home-page-widget:homepage/rhdh-onboarding-section',
      );
    });

    it('homepage widgets and layout attach to page:homepage', () => {
      const homepageWidgets = getRuntimeExtensions(homepagePlugin).filter(ext =>
        ext.id.startsWith('home-page-widget:'),
      );
      expect(homepageWidgets.length).toBeGreaterThan(0);

      for (const ext of homepageWidgets) {
        expect(getAttachTo(ext)).toEqual({
          id: HOMEPAGE_PAGE_ID,
          input: 'widgets',
        });
      }

      const layout = getRuntimeExtensions(homepagePlugin).find(ext =>
        ext.id.startsWith('home-page-layout:'),
      );
      expect(layout).toBeDefined();
      expect(getAttachTo(layout!)).toEqual({
        id: HOMEPAGE_PAGE_ID,
        input: 'layout',
      });
    });

    it('should export homepageTranslationsModule with correct structure', () => {
      expect(homepageTranslationsModule).toBeDefined();
      expect(homepageTranslationsModule.$$type).toBe(
        '@backstage/FrontendModule',
      );
      expect(homepageTranslationsModule.pluginId).toBe('app');
    });
  });

  describe('Translations', () => {
    it('should export homepageTranslationRef', () => {
      expect(homepageTranslationRef).toBeDefined();
      expect(homepageTranslationRef.id).toBe('plugin.homepage');
    });

    it('should export homepageTranslations', () => {
      expect(homepageTranslations).toBeDefined();
      expect(typeof homepageTranslations).toBe('object');
    });
  });

  describe('Layout Extension', () => {
    it('should export homePageLayoutExtension', () => {
      expect(homePageLayoutExtension).toBeDefined();
    });
  });

  describe('Widget Extensions', () => {
    it('should export all widget extensions', () => {
      expect(onboardingSectionWidget).toBeDefined();
      expect(entitySectionWidget).toBeDefined();
      expect(templateSectionWidget).toBeDefined();
      expect(quickAccessCardWidget).toBeDefined();
      expect(searchBarWidget).toBeDefined();
      expect(featuredDocsCardWidget).toBeDefined();
      expect(catalogStarredWidget).toBeDefined();
      expect(disableToolkit).toBeDefined();
      expect(disableRandomJoke).toBeDefined();
      expect(RecentlyVisitedWidget).toBeDefined();
      expect(TopVisitedWidget).toBeDefined();
    });
  });

  describe('APIs', () => {
    it('should export quickAccessApi', () => {
      expect(quickAccessApi).toBeDefined();
    });
  });
});
