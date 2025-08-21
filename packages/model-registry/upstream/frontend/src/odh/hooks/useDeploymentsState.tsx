import React from 'react';

// Context for sharing deployments state
type DeploymentsStateContextType = {
  deployments?: any[];
  loaded: boolean;
};

export const DeploymentsStateContext = React.createContext<DeploymentsStateContextType>({
  deployments: undefined,
  loaded: false,
});

/**
 * Hook to access deployments state from shared context.
 * Must be used within MRDeploymentsContextProvider.
 */
export const useDeploymentsState = () => {
  const context = React.useContext(DeploymentsStateContext);

  return context;
};
