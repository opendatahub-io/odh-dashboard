import { ModelRegistryAPIState } from '~/app/context/useModelRegistryAPIState';
type UseModelRegistryAPI = ModelRegistryAPIState & {
    refreshAllAPI: () => void;
};
export declare const useModelRegistryAPI: () => UseModelRegistryAPI;
export {};
