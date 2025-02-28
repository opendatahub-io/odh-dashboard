import { ModelRegistryAPIState } from '~/app/hooks/useModelRegistryAPIState';
type UseModelRegistryAPI = ModelRegistryAPIState & {
    refreshAllAPI: () => void;
};
export declare const useModelRegistryAPI: () => UseModelRegistryAPI;
export {};
