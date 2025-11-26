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

import { createContext } from 'react';

import { ChatbotDisplayMode } from '@patternfly/chatbot';

/**
 * Type for LightspeedDrawerContext
 *
 * @public
 */
export interface LightspeedDrawerContextType {
  /**
   * The current display mode
   */
  displayMode: ChatbotDisplayMode;
  /**
   * The function to set the display mode
   */
  setDisplayMode: (mode: ChatbotDisplayMode) => void;
  /**
   * The drawer width (for docked mode)
   */
  drawerWidth: number;
  /**
   * The function for setting the drawer width
   */
  setDrawerWidth: React.Dispatch<React.SetStateAction<number>>;
}

/**
 * @public
 */
export const LightspeedDrawerContext = createContext<
  LightspeedDrawerContextType | undefined
>(undefined);
