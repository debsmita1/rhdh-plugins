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

import type { CSSProperties } from 'react';
import { useApp } from '@backstage/core-plugin-api';

import { LightspeedIcon } from './LightspeedIcon';

export interface QuickstartItemIconProps {
  icon?: string;
  sx?: CSSProperties;
}

const commonIcons: Record<string, string> = {
  Admin: 'admin_panel_settings',
  Rbac: 'vpn_key',
  Git: 'content_copy',
  Plugins: 'power_settings_new',
  Import: 'login',
  Catalog: 'category',
  SelfService: 'control_point',
  Learning: 'school',
};

const iconWrapperStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const imageIconStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
};

export const QuickstartItemIcon = ({ icon, sx }: QuickstartItemIconProps) => {
  const app = useApp();
  if (!icon) {
    return null;
  }

  const SystemIcon = app.getSystemIcon(icon);
  if (SystemIcon) {
    return (
      <div style={{ ...iconWrapperStyle, ...sx }}>
        <SystemIcon fontSize="medium" />
      </div>
    );
  }

  if (icon.startsWith('<svg')) {
    const svgDataUri = `data:image/svg+xml;base64,${btoa(icon)}`;
    return (
      <div style={{ ...imageIconStyle, ...sx }}>
        <img src={svgDataUri} alt="" height="100%" width="100%" />
      </div>
    );
  }

  if (
    icon.startsWith('https://') ||
    icon.startsWith('http://') ||
    icon.startsWith('/') ||
    icon.startsWith('data:image/')
  ) {
    return (
      <div style={{ ...imageIconStyle, ...sx }}>
        <img src={icon} alt="" height="100%" width="100%" />
      </div>
    );
  }

  if (icon === 'Lightspeed') {
    return (
      <div style={{ ...iconWrapperStyle, ...sx }}>
        <LightspeedIcon />
      </div>
    );
  }

  const materialIcon = commonIcons[icon] ?? icon;

  return (
    <div
      className="material-icons-outlined"
      style={{ ...iconWrapperStyle, ...sx }}
    >
      {materialIcon}
    </div>
  );
};
