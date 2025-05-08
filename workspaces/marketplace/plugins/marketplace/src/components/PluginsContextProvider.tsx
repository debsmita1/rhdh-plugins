/*
 * Copyright The Backstage Authors
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

import React, { createContext, useContext } from 'react';

type PluginsContextType = {
  plugins: any;
  setPlugins: (plugins: any) => void;
};

export const PluginsContext = createContext<PluginsContextType>({
  plugins: [],
  setPlugins: () => {},
});

export const PluginsContextProvider = ({
  children,
}: {
  children: React.ReactElement;
}) => {
  const [plugins, setPlugins] = React.useState([]);

  const pluginsContextProviderValue = React.useMemo(
    () => ({
      plugins,
      setPlugins,
    }),
    [plugins, setPlugins],
  );

  return (
    <PluginsContext.Provider value={pluginsContextProviderValue}>
      {children}
    </PluginsContext.Provider>
  );
};
export const usePluginsContext = () => useContext(PluginsContext);
