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

import { PropsWithChildren, useEffect, useState } from 'react';

import { identityApiRef, useApi } from '@backstage/core-plugin-api';

import { ChatbotDisplayMode } from '@patternfly/chatbot';

import { LightspeedDrawerContext } from './LightspeedDrawerContext';

// import { ResizableDrawer } from './ResizableDrawer';

/**
 * Provider component for the Lightspeed Drawer functionality
 * @public
 */
export const LightspeedDrawerProvider = ({ children }: PropsWithChildren) => {
  const [displayMode, setDisplayMode] = useState<ChatbotDisplayMode>(
    ChatbotDisplayMode.default,
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [drawerWidth, setDrawerWidth] = useState<number>(400);
  const [userKey, setUserKey] = useState<string>('guest');
  const identityApi = useApi(identityApiRef);

  // Resolve the current user's identity to scope localStorage keys per user
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const identity = await identityApi.getBackstageIdentity();
        const ref = identity?.userEntityRef?.toLowerCase() || 'guest';
        if (!cancelled) setUserKey(ref);
      } catch (e) {
        if (!cancelled) setUserKey('guest');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [identityApi]);

  // Load display mode from localStorage on mount
  useEffect(() => {
    if (!userKey) return;

    const displayModeKey = `lightspeed-display-mode:${userKey}`;
    const drawerOpenKey = `lightspeed-drawer-open:${userKey}`;
    const drawerWidthKey = `lightspeed-drawer-width:${userKey}`;

    const savedDisplayMode = localStorage.getItem(displayModeKey);
    const savedDrawerOpen = localStorage.getItem(drawerOpenKey);
    const savedDrawerWidth = localStorage.getItem(drawerWidthKey);

    if (savedDisplayMode) {
      const mode = savedDisplayMode as ChatbotDisplayMode;
      setDisplayMode(mode);
      // If mode is docked, restore drawer state
      if (mode === ChatbotDisplayMode.docked) {
        setIsDrawerOpen(savedDrawerOpen === 'true');
      }
    }

    if (savedDrawerWidth) {
      const width = parseInt(savedDrawerWidth, 10);
      if (!Number.isNaN(width) && width > 0) {
        setDrawerWidth(width);
      }
    }
  }, [userKey]);

  // Save display mode to localStorage when it changes
  useEffect(() => {
    if (!userKey) return;

    const displayModeKey = `lightspeed-display-mode:${userKey}`;
    localStorage.setItem(displayModeKey, displayMode);

    // Handle drawer state based on display mode
    if (displayMode === ChatbotDisplayMode.docked) {
      // When switching to docked mode, open the drawer if not already open
      setIsDrawerOpen(prev => (prev ? prev : true));
    } else {
      // When switching away from docked mode, close the drawer
      setIsDrawerOpen(false);
    }
  }, [displayMode, userKey]);

  // Save drawer state to localStorage
  useEffect(() => {
    if (!userKey) return;

    const drawerOpenKey = `lightspeed-drawer-open:${userKey}`;
    localStorage.setItem(drawerOpenKey, isDrawerOpen.toString());
  }, [isDrawerOpen, userKey]);

  // Save drawer width to localStorage
  useEffect(() => {
    if (!userKey) return;

    const drawerWidthKey = `lightspeed-drawer-width:${userKey}`;
    localStorage.setItem(drawerWidthKey, drawerWidth.toString());
  }, [drawerWidth, userKey]);

  // Set CSS variables for drawer width when drawer is open
  useEffect(() => {
    if (isDrawerOpen && displayMode === ChatbotDisplayMode.docked) {
      document.body.classList.add('lightspeed-drawer-open');
      document.body.style.setProperty(
        '--lightspeed-drawer-width',
        `${drawerWidth}px`,
      );
    } else {
      document.body.classList.remove('lightspeed-drawer-open');
      document.body.style.removeProperty('--lightspeed-drawer-width');
    }

    return () => {
      document.body.classList.remove('lightspeed-drawer-open');
      document.body.style.removeProperty('--lightspeed-drawer-width');
    };
  }, [isDrawerOpen, drawerWidth, displayMode]);

  const handleSetDisplayMode = (mode: ChatbotDisplayMode) => {
    setDisplayMode(mode);
    if (mode === ChatbotDisplayMode.docked) {
      setIsDrawerOpen(true);
    } else {
      setIsDrawerOpen(false);
    }
  };

  return (
    <LightspeedDrawerContext.Provider
      value={{
        displayMode,
        setDisplayMode: handleSetDisplayMode,
        drawerWidth,
        setDrawerWidth,
      }}
    >
      {children}
    </LightspeedDrawerContext.Provider>
  );
};
