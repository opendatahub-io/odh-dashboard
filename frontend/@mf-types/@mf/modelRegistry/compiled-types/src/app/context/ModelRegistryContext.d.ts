import * as React from 'react';
import { ModelRegistryAPIState } from '~/app/hooks/useModelRegistryAPIState';
export type ModelRegistryContextType = {
    apiState: ModelRegistryAPIState;
    refreshAPIState: () => void;
};
type ModelRegistryContextProviderProps = {
    children: React.ReactNode;
    modelRegistryName: string;
};
export declare const ModelRegistryContext: React.Context<ModelRegistryContextType>;
export declare const ModelRegistryContextProvider: React.FC<ModelRegistryContextProviderProps>;
export {};
