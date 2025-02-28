import * as React from 'react';
import { Namespace } from '~/shared/types';
export type NamespaceSelectorContextType = {
    namespacesLoaded: boolean;
    namespacesLoadError?: Error;
    namespaces: Namespace[];
    preferredNamespace: Namespace | undefined;
    updatePreferredNamespace: (namespace: Namespace | undefined) => void;
    initializationError?: Error;
};
type NamespaceSelectorContextProviderProps = {
    children: React.ReactNode;
};
export declare const NamespaceSelectorContext: React.Context<NamespaceSelectorContextType>;
export declare const NamespaceSelectorContextProvider: React.FC<NamespaceSelectorContextProviderProps>;
declare global {
    interface Window {
        centraldashboard: any;
    }
}
export {};
