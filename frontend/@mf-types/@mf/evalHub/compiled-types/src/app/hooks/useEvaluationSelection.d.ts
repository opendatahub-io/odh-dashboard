import { Collection, FlatBenchmark } from '~/app/types';
type UseEvaluationSelectionResult = {
    benchmark: FlatBenchmark | undefined;
    collection: Collection | undefined;
    isCollectionFlow: boolean;
    dataLoaded: boolean;
    loadError: Error | undefined;
};
export declare const useEvaluationSelection: (namespace: string | undefined) => UseEvaluationSelectionResult;
export {};
