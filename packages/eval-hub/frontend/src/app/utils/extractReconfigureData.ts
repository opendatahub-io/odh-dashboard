import type {
  Collection,
  EvaluationJob,
  FlatBenchmark,
  InferenceServiceItem,
  ModelSelection,
  SourceMode,
  TestDataRef,
} from '~/app/types';
import { getEvaluationName, getThresholdInputValue } from '~/app/utilities/evaluationUtils';
import { buildS3DatasetUrl } from '~/app/utils/s3DatasetUrl';
import {
  isPrerecordedS3TestDataRef,
  parseTestDataRef,
  testDataRefDefaultValues,
  type TestDataRefFormValues,
} from '~/app/schemas/testDataRef.schema';

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
  testDataRef: TestDataRefFormValues;
  benchmark: FlatBenchmark | undefined;
  collection: Collection | undefined;
  isCollectionFlow: boolean;
  threshold: number;
  primaryMetric: string | undefined;
  additionalArgs: string;
  experimentName: string | undefined;
  hardwareProfile: string | undefined;
  queue: string | undefined;
};

// The run form only supports S3-hosted prerecorded responses, so only the s3
// variant participates in prerecorded detection. Non-S3 prerecorded references
// are unsupported and scrubbed below (see isUnsupportedPrerecordedRef).
const isPrerecordedTestDataRef = (
  benchmarks: NonNullable<EvaluationJob['benchmarks']> | null | undefined,
): boolean => benchmarks?.some((b) => isPrerecordedS3TestDataRef(b.test_data_ref)) ?? false;

// Non-S3 references typed pre_recorded_data. The UI has no flow to create or
// edit these — prerecorded responses are S3-only — so reconfiguration drops
// them instead of carrying a reference the form cannot represent.
const isUnsupportedPrerecordedRef = (ref: TestDataRef | undefined): boolean =>
  !!ref && !ref.s3 && (ref.pvc?.type ?? ref.git?.type ?? ref.hf?.type) === 'pre_recorded_data';

export const inferSourceMode = (
  job: EvaluationJob,
  inferenceServices: InferenceServiceItem[],
  benchmarks?: NonNullable<EvaluationJob['benchmarks']> | null,
): { sourceMode: SourceMode; modelSelection: ModelSelection } => {
  if (isPrerecordedTestDataRef(benchmarks ?? job.collection?.benchmarks ?? job.benchmarks)) {
    return { sourceMode: 'prerecorded', modelSelection: 'external' };
  }

  const matchesClusterModel = inferenceServices.some((is) => is.name === job.model.name);
  if (matchesClusterModel) {
    return { sourceMode: 'model', modelSelection: 'cluster' };
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
      // Unsupported non-S3 prerecorded references are scrubbed rather than
      // passed through (see isUnsupportedPrerecordedRef).
      test_data_ref: isUnsupportedPrerecordedRef(b.test_data_ref) ? undefined : b.test_data_ref,
    }));
    collection = {
      resource: { id: job.collection.id },
      name: resolvedCollection?.name ?? job.collection.id,
      pass_criteria: job.pass_criteria,
      benchmarks: collectionBenchmarks,
    };
  }
  /* eslint-enable camelcase */

  // Collection flow writes pass_criteria at the job level; benchmark flow writes it on the
  // individual benchmark entry. Fall back to the first benchmark to cover the latter case.
  const passCriteria = job.pass_criteria ?? firstBenchmark?.pass_criteria;
  const primaryMetric = firstBenchmark?.primary_score?.metric;
  const threshold = passCriteria
    ? getThresholdInputValue(passCriteria.threshold, isCollectionFlow ? undefined : primaryMetric)
    : 0;

  let additionalArgs = '';
  if (firstBenchmark?.parameters && Object.keys(firstBenchmark.parameters).length > 0) {
    additionalArgs = JSON.stringify(firstBenchmark.parameters, null, 2);
  }

  let datasetUrl = '';
  let accessToken = '';
  if (sourceMode === 'prerecorded') {
    const refBenchmark = effectiveBenchmarks?.find((b) =>
      isPrerecordedS3TestDataRef(b.test_data_ref),
    );
    if (refBenchmark?.test_data_ref?.s3) {
      const { s3 } = refBenchmark.test_data_ref;
      // Jobs created after the S3DataRef contract split store bucket and key
      // separately; the previous UI emitted the full s3:// URL in key with no
      // bucket.
      datasetUrl = s3.bucket ? buildS3DatasetUrl(s3.bucket, s3.key ?? '') : (s3.key ?? '');
      // eslint-disable-next-line camelcase
      accessToken = s3.secret_ref ?? '';
    }
  }

  // Model-mode reconfigures hydrate the test data section; prerecorded jobs keep
  // their dataset fields instead — both edit the same test_data_ref object.
  // Unsupported non-S3 prerecorded references are skipped so they stay scrubbed.
  let testDataRef: TestDataRefFormValues = { ...testDataRefDefaultValues };
  if (sourceMode === 'model') {
    const refBenchmark = effectiveBenchmarks?.find(
      (b) => b.test_data_ref && !isUnsupportedPrerecordedRef(b.test_data_ref),
    );
    testDataRef = parseTestDataRef(refBenchmark?.test_data_ref);
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
    testDataRef,
    benchmark,
    collection,
    isCollectionFlow,
    threshold,
    primaryMetric,
    additionalArgs,
    experimentName: job.experiment?.name,
    hardwareProfile: job.hardware_config?.hardware_profile_name,
    queue: job.hardware_config?.queue?.name ?? job.status.queue ?? job.resource.queue,
  };
};

export default extractReconfigureData;
