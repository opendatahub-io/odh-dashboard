import React from 'react';
export declare const useDeploymentsContext: () => {
    deploymentsState: {
        deployments?: any[];
        loaded: boolean;
        errors?: Error[];
        projects?: any[];
    };
    DeploymentsProviderComponent: false | React.ComponentType<{
        children: React.ReactNode;
        labelSelectors?: {
            [key: string]: string;
        };
    }>;
    hookNotifyComponent: React.JSX.Element | null;
    isExtensionLoaded: boolean;
};
