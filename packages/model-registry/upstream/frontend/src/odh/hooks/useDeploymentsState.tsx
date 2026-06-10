import React from 'react';
import type { ModelRegistryDeploymentListItem } from '~/odh/k8sTypes';

// Context for sharing deployments state
type DeploymentsStateContextType = {
  deployments?: ModelRegistryDeploymentListItem[];
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
export const useDeploymentsState = (): DeploymentsStateContextType => {
  const context = React.useContext(DeploymentsStateContext);

  return context;
};
