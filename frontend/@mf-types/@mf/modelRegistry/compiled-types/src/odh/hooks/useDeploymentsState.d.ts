import React from 'react';
type DeploymentsStateContextType = {
    deployments?: any[];
    loaded: boolean;
};
export declare const DeploymentsStateContext: React.Context<DeploymentsStateContextType>;
/**
 * Hook to access deployments state from shared context.
 * Must be used within MRDeploymentsContextProvider.
 */
export declare const useDeploymentsState: () => DeploymentsStateContextType;
export {};
