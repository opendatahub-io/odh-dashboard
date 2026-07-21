import { Collection, CreateEvaluationJobRequest, FlatBenchmark, JobPassCriteria, JobPrimaryScore, SourceMode } from '~/app/types';
type BuildEvaluationRequestParams = {
    evaluationName: string;
    sourceMode: SourceMode;
    benchmark: FlatBenchmark | undefined;
    collection: Collection | undefined;
    modelName: string;
    endpointUrl: string;
    apiKeySecretRef: string;
    sourceName: string;
    datasetUrl: string;
    accessToken: string;
    additionalArgs: Record<string, unknown>;
    experimentName?: string;
    experimentTags?: {
        key: string;
        value: string;
    }[];
    passCriteriaOverride?: JobPassCriteria;
    primaryScoreOverride?: JobPrimaryScore;
};
declare const buildEvaluationRequest: ({ evaluationName, sourceMode, benchmark, collection, modelName, endpointUrl, apiKeySecretRef, sourceName, datasetUrl, accessToken, additionalArgs, experimentName, experimentTags, passCriteriaOverride, primaryScoreOverride, }: BuildEvaluationRequestParams) => CreateEvaluationJobRequest;
export default buildEvaluationRequest;
