import * as React from 'react';
import { ModelRegistry } from '~/app/types';
export declare const MODEL_REGISTRY_SELECTED_STORAGE_KEY = "kubeflow.dashboard.model.registry.selected";
export declare const MODEL_REGISTRY_FAVORITE_STORAGE_KEY = "kubeflow.dashboard.model.registry.favorite";
export type ModelRegistrySelectorContextType = {
    modelRegistriesLoaded: boolean;
    modelRegistriesLoadError?: Error;
    modelRegistries: ModelRegistry[];
    preferredModelRegistry: ModelRegistry | undefined;
    updatePreferredModelRegistry: (modelRegistry: ModelRegistry | undefined) => void;
};
type ModelRegistrySelectorContextProviderProps = {
    children: React.ReactNode;
};
export declare const ModelRegistrySelectorContext: React.Context<ModelRegistrySelectorContextType>;
export declare const ModelRegistrySelectorContextProvider: React.FC<ModelRegistrySelectorContextProviderProps>;
export {};
