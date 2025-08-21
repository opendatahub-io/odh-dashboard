import React from 'react';
export declare const useDeploymentsContext: () => {
    deploymentsState: {
        deployments?: any[];
        loaded: boolean;
        errors?: Error[];
        projects?: any[];
    };
    DeploymentsProviderComponent: false | React.ComponentType<{
        children: ({ deployments, loaded, errors, projects, }: {
            deployments?: any[];
            loaded: boolean;
            errors?: Error[];
            projects?: import("@odh-dashboard/internal/k8sTypes.js").ProjectKind[];
        }) => React.ReactNode;
        labelSelectors?: {
            [key: string]: string;
        };
    }>;
    hookNotifyComponent: React.JSX.Element | null;
    isExtensionLoaded: boolean;
};
