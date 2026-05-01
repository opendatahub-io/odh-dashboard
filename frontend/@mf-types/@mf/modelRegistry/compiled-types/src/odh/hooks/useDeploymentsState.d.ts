import React from 'react';
import type { ModelRegistryDeploymentListItem } from '~/odh/k8sTypes';
type DeploymentsStateContextType = {
    deployments?: ModelRegistryDeploymentListItem[];
    loaded: boolean;
};
export declare const DeploymentsStateContext: React.Context<DeploymentsStateContextType>;
/**
 * Hook to access deployments state from shared context.
 * Must be used within MRDeploymentsContextProvider.
 */
export declare const useDeploymentsState: () => DeploymentsStateContextType;
export {};
