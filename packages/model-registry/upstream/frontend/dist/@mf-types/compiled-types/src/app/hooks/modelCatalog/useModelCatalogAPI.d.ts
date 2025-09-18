import { ModelCatalogAPIState } from './useModelCatalogAPIState';
type UseModelRegistryAPI = ModelCatalogAPIState & {
    refreshAllAPI: () => void;
};
export declare const useModelCatalogAPI: () => UseModelRegistryAPI;
export {};
