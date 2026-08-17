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

const hasTestDataRef = (
  benchmarks: NonNullable<EvaluationJob['benchmarks']> | null | undefined,
): boolean => benchmarks?.some((b) => b.test_data_ref?.s3) ?? false;

export const inferSourceMode = (
  job: EvaluationJob,
  inferenceServices: InferenceServiceItem[],
  benchmarks?: NonNullable<EvaluationJob['benchmarks']> | null,
): { sourceMode: SourceMode; modelSelection: ModelSelection } => {
  if (hasTestDataRef(benchmarks ?? job.collection?.benchmarks ?? job.benchmarks)) {
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
  const isCollectionFlow = !!job.collection;

  const jobCollectionBenchmarks = job.collection?.benchmarks;
  const effectiveBenchmarks: EvaluationJob['benchmarks'] = isCollectionFlow
    ? jobCollectionBenchmarks?.length
      ? jobCollectionBenchmarks
      : resolvedCollection?.benchmarks
    : job.benchmarks;

  const { sourceMode, modelSelection } = inferSourceMode(
    job,
    inferenceServices,
    effectiveBenchmarks,
  );
  const selectedInferenceService =
    modelSelection === 'cluster'
      ? inferenceServices.find((is) => is.name === job.model.name)
      : undefined;

  const firstBenchmark = effectiveBenchmarks?.[0];

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
    const collectionBenchmarks = effectiveBenchmarks?.map((b) => ({
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
      benchmarks: collectionBenchmarks,
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
    const refBenchmark = effectiveBenchmarks?.find((b) => b.test_data_ref?.s3);
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
