import { Provider } from '~/app/types';
type UseProvidersResult = {
    providers: Provider[];
    loaded: boolean;
    loadError: Error | undefined;
};
export declare const useProviders: (namespace: string) => UseProvidersResult;
export {};
