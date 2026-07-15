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

import { useTheme } from '@mui/material/styles';

import { getImageForIconClass } from '../utils/icons';

/**
 * @public
 * Bulk Import Icon
 */
export const BulkImportIcon = () => {
  const theme = useTheme();
  const isDarkTheme = theme.palette.mode === 'dark';
  const iconClass = isDarkTheme
    ? 'icon-bulk-import-white'
    : 'icon-bulk-import-black';

  return (
    <img
      src={getImageForIconClass(iconClass)}
      alt="bulk import icon"
      style={{ height: '25px' }}
    />
  );
};

export default BulkImportIcon;
