import * as React from 'react';

export type McpCatalogSettingsContextType = Record<string, never>;

type McpCatalogSettingsContextProviderProps = {
  children: React.ReactNode;
};

export const McpCatalogSettingsContext = React.createContext<McpCatalogSettingsContextType>({});

export const McpCatalogSettingsContextProvider: React.FC<
  McpCatalogSettingsContextProviderProps
> = ({ children }) => {
  const contextValue = React.useMemo(() => ({}), []);

  return (
    <McpCatalogSettingsContext.Provider value={contextValue}>
      {children}
    </McpCatalogSettingsContext.Provider>
  );
};
