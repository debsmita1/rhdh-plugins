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

import { useCallback, useEffect, useRef, useState } from 'react';

import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import { styled } from '@mui/material/styles';

import { ThemeConfig } from '@red-hat-developer-hub/backstage-plugin-theme';

const Handle = styled('div')(({ theme }) => ({
  width: 6,
  cursor: 'col-resize',
  position: 'absolute',
  top: 0,
  left: 0,
  bottom: 0,
  zIndex: 1201,
  backgroundColor: theme.palette.divider,
}));

type ResizableDrawerProps = {
  children: React.ReactNode;
  minWidth?: number;
  maxWidth?: number;
  initialWidth?: number;
  isDrawerOpen: boolean;
  drawerWidth?: number;
  onWidthChange?: (width: number) => void;
  isResizable?: boolean;
  [key: string]: any;
};

export const ResizableDrawer = (props: ResizableDrawerProps) => {
  const {
    children,
    minWidth = 180,
    maxWidth = 500,
    initialWidth = 260,
    isDrawerOpen,
    drawerWidth: externalDrawerWidth,
    onWidthChange,
    isResizable = true,
    ...drawerProps
  } = props;

  const [width, setWidth] = useState(externalDrawerWidth || initialWidth);
  const resizingRef = useRef(false);

  // Sync with external drawerWidth if provided
  useEffect(() => {
    if (externalDrawerWidth !== undefined && externalDrawerWidth !== width) {
      setWidth(externalDrawerWidth);
    }
  }, [externalDrawerWidth, width]);

  const onMouseDown = () => {
    resizingRef.current = true;
  };

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!resizingRef.current) return;
      // For right-anchored drawer, calculate width from the right edge
      const newWidth = window.innerWidth - e.clientX;

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWidth(newWidth);
        if (onWidthChange) {
          onWidthChange(newWidth);
        }
      }
    },
    [maxWidth, minWidth, onWidthChange],
  );

  const onMouseUp = () => {
    resizingRef.current = false;
  };

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove]);

  // Ensure anchor is always 'right' and not overridden by drawerProps
  const { anchor: _, ...restDrawerProps } = drawerProps;

  return (
    <Drawer
      {...restDrawerProps}
      anchor="right"
      sx={{
        '& .v5-MuiDrawer-paper': {
          width: width,
          boxSizing: 'border-box',
          backgroundColor: theme => {
            const themeConfig = theme as ThemeConfig;
            return (
              themeConfig.palette?.rhdh?.general?.sidebarBackgroundColor ||
              theme.palette.background.paper
            );
          },
          justifyContent: 'space-between',
        },
        // Only apply header offset when global header exists
        'body:has(#global-header) &': {
          '& .v5-MuiDrawer-paper': {
            top: '64px !important',
            height: 'calc(100vh - 64px) !important',
          },
        },
      }}
      variant="persistent"
      open={isDrawerOpen}
    >
      <Box sx={{ height: '100%', position: 'relative' }}>
        {children}
        {isResizable && <Handle onMouseDown={onMouseDown} />}
      </Box>
    </Drawer>
  );
};
