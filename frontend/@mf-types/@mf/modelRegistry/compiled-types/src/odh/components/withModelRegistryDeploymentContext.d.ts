import * as React from 'react';
type WithDeploymentContextProps = {
    labelSelectors?: {
        [key: string]: string;
    };
};
/**
 * Higher-order component that wraps children with MRDeploymentsContextProvider
 * Automatically handles preferredModelRegistry context access
 */
export declare const withModelRegistryDeploymentContext: <P extends object>(Component: React.ComponentType<P>) => React.FC<P & WithDeploymentContextProps>;
export {};
