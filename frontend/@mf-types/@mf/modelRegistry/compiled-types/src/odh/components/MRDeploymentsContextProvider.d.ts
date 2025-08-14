import React from 'react';
interface MRDeploymentsContextProviderProps {
    children: React.ReactNode;
    labelSelectors?: {
        [key: string]: string;
    };
}
/**
 * Provider component that automatically wraps children with deployments context if available.
 * Uses extensions to provide the deployments provider.
 */
export declare const MRDeploymentsContextProvider: React.FC<MRDeploymentsContextProviderProps>;
export {};
