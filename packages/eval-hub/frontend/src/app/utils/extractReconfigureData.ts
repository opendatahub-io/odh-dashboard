import type {
  Collection,
  EvaluationJob,
  FlatBenchmark,
  InferenceServiceItem,
  ModelSelection,
  SourceMode,
} from '~/app/types';
import { getEvaluationName } from '~/app/utilities/evaluationUtils';

export type ReconfigureFormData = {
  evaluationName: string;
  sourceMode: SourceMode;
  modelSelection: ModelSelection;
  modelName: string;
  selectedInferenceService: InferenceServiceItem | undefined;
  endpointUrl: string;
  apiKeySecretRef: string;
  sourceName: string;
  datasetUrl: string;
  accessToken: string;
  benchmark: FlatBenchmark | undefined;
  collection: Collection | undefined;
  isCollectionFlow: boolean;
  threshold: number;
  primaryMetric: string | undefined;
  additionalArgs: string;
  experimentName: string | undefined;
};

const hasTestDataRef = (job: EvaluationJob): boolean => {
  const benchmarks = job.collection?.benchmarks ?? job.benchmarks;
  return benchmarks?.some((b) => b.test_data_ref?.s3) ?? false;
};

export const inferSourceMode = (
  job: EvaluationJob,
  inferenceServices: InferenceServiceItem[],
): { sourceMode: SourceMode; modelSelection: ModelSelection } => {
  if (hasTestDataRef(job)) {
    return { sourceMode: 'prerecorded', modelSelection: 'external' };
  }

  const matchesClusterModel = inferenceServices.some((is) => is.name === job.model.name);
  if (matchesClusterModel) {
    return { sourceMode: 'model', modelSelection: 'cluster' };
  }

  if (job.model.url) {
    return { sourceMode: 'agent', modelSelection: 'external' };
  }

  return { sourceMode: 'model', modelSelection: 'external' };
};

const extractReconfigureData = (
  job: EvaluationJob,
  inferenceServices: InferenceServiceItem[],
  resolvedCollection?: Collection,
): ReconfigureFormData => {
  const { sourceMode, modelSelection } = inferSourceMode(job, inferenceServices);
  const selectedInferenceService =
    modelSelection === 'cluster'
      ? inferenceServices.find((is) => is.name === job.model.name)
      : undefined;
  const isCollectionFlow = !!job.collection;

  const allBenchmarks = job.collection?.benchmarks ?? job.benchmarks;
  const firstBenchmark = allBenchmarks?.[0];

  /* eslint-disable camelcase */
  let benchmark: FlatBenchmark | undefined;
  if (!isCollectionFlow && firstBenchmark) {
    benchmark = {
      id: firstBenchmark.id,
      providerId: firstBenchmark.provider_id ?? '',
      providerName: '',
      name: firstBenchmark.id,
      primary_score: firstBenchmark.primary_score,
      pass_criteria: firstBenchmark.pass_criteria,
      metrics: firstBenchmark.primary_score ? [firstBenchmark.primary_score.metric] : [],
    };
  }

  let collection: Collection | undefined;
  if (isCollectionFlow && job.collection) {
    const jobBenchmarks = job.collection.benchmarks?.map((b) => ({
      id: b.id,
      provider_id: b.provider_id,
      primary_score: b.primary_score,
      pass_criteria: b.pass_criteria,
      parameters: b.parameters,
    }));
    collection = {
      resource: { id: job.collection.id },
      name: resolvedCollection?.name ?? job.collection.id,
      pass_criteria: job.pass_criteria,
      benchmarks: jobBenchmarks ?? resolvedCollection?.benchmarks,
    };
  }
  /* eslint-enable camelcase */

  const threshold = job.pass_criteria ? Math.round(job.pass_criteria.threshold * 100) : 0;

  const primaryMetric = firstBenchmark?.primary_score?.metric;

  let additionalArgs = '';
  if (firstBenchmark?.parameters && Object.keys(firstBenchmark.parameters).length > 0) {
    additionalArgs = JSON.stringify(firstBenchmark.parameters, null, 2);
  }

  let datasetUrl = '';
  let accessToken = '';
  if (sourceMode === 'prerecorded') {
    const refBenchmark = allBenchmarks?.find((b) => b.test_data_ref?.s3);
    if (refBenchmark?.test_data_ref?.s3) {
      datasetUrl = refBenchmark.test_data_ref.s3.key ?? '';
      accessToken = refBenchmark.test_data_ref.s3.secret_ref ?? '';
    }
  }

  return {
    evaluationName: getEvaluationName(job),
    sourceMode,
    modelSelection,
    modelName: job.model.name,
    selectedInferenceService,
    endpointUrl: job.model.url ?? '',
    apiKeySecretRef: job.model.auth?.secret_ref ?? '',
    sourceName: sourceMode === 'prerecorded' ? job.model.name : '',
    datasetUrl,
    accessToken,
    benchmark,
    collection,
    isCollectionFlow,
    threshold,
    primaryMetric,
    additionalArgs,
    experimentName: job.experiment?.name,
  };
};

export default extractReconfigureData;
