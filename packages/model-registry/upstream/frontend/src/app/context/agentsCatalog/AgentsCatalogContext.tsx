import * as React from 'react';

export type AgentsCatalogContextType = Record<string, never>;

type AgentsCatalogContextProviderProps = {
  children: React.ReactNode;
};

export const AgentsCatalogContext = React.createContext<AgentsCatalogContextType>({});

export const AgentsCatalogContextProvider: React.FC<AgentsCatalogContextProviderProps> = ({
  children,
}) => {
  const contextValue = React.useMemo(() => ({}), []);

  return (
    <AgentsCatalogContext.Provider value={contextValue}>{children}</AgentsCatalogContext.Provider>
  );
};
