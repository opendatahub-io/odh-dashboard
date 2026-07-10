import { InferenceServiceItem } from '~/app/types';
type UseInferenceServicesResult = {
    inferenceServices: InferenceServiceItem[];
    loaded: boolean;
    loadError: Error | undefined;
    warning: string | undefined;
};
export declare const useInferenceServices: (namespace: string) => UseInferenceServicesResult;
export {};
