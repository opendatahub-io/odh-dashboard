import * as React from 'react';
import { ModelRegistry } from '~/app/types';
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
