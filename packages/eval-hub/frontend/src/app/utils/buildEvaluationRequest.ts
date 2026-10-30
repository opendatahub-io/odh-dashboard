import {
  Collection,
  CreateEvaluationJobRequest,
  FlatBenchmark,
  JobPassCriteria,
  JobPrimaryScore,
  SourceMode,
  TestDataRef,
} from '~/app/types';
import {
  isPrerecordedS3TestDataRef,
  serializeTestDataRef,
  type TestDataRefFormValues,
} from '~/app/schemas/testDataRef.schema';
import { buildS3DatasetUrl, parseS3DatasetUrl } from '~/app/utils/s3DatasetUrl';

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
  testDataRef: TestDataRefFormValues;
  additionalArgs: Record<string, unknown>;
  experimentName?: string;
  experimentTags?: { key: string; value: string }[];
  passCriteriaOverride?: JobPassCriteria;
  primaryScoreOverride?: JobPrimaryScore;
  hardwareProfile?: string;
  queue?: string;
};

const TOP_LEVEL_KEYS = new Set(['experiment', 'tags', 'custom', 'exports', 'pass_criteria']);

/* eslint-disable camelcase */
/**
 * Merges a collection-wide prerecorded edit into a benchmark's stored S3
 * reference. Each dimension applies independently: a location edit replaces
 * the bucket and key everywhere, a secret edit rotates the secret everywhere,
 * and untouched dimensions keep each benchmark's own stored value. A stored
 * ref without a bucket is the legacy shape (full s3:// URL in key) and is
 * upgraded to the split bucket/key contract even when no field was edited.
 */
const mergePrerecordedRef = (
  stored: TestDataRef,
  edited: { type: 'pre_recorded_data'; s3: { bucket: string; key: string; secret_ref: string } },
  locationEdited: boolean,
  secretEdited: boolean,
): TestDataRef => {
  const isLegacyRef = !stored.s3?.bucket;
  if (!locationEdited && !secretEdited && !isLegacyRef) {
    return stored;
  }
  return {
    ...stored,
    s3: {
      ...stored.s3,
      ...(locationEdited || isLegacyRef ? { bucket: edited.s3.bucket, key: edited.s3.key } : {}),
      ...(secretEdited ? { secret_ref: edited.s3.secret_ref } : {}),
    },
  };
};
/* eslint-enable camelcase */

const buildEvaluationRequest = ({
  evaluationName,
  sourceMode,
  benchmark,
  collection,
  modelName,
  endpointUrl,
  apiKeySecretRef,
  sourceName,
  datasetUrl,
  accessToken,
  testDataRef,
  additionalArgs,
  experimentName,
  experimentTags,
  passCriteriaOverride,
  primaryScoreOverride,
  hardwareProfile,
  queue,
}: BuildEvaluationRequestParams): CreateEvaluationJobRequest => {
  const topLevelOverrides: Record<string, unknown> = {};
  const benchmarkParams: Record<string, unknown> = {};

  Object.entries(additionalArgs).forEach(([key, value]) => {
    if (TOP_LEVEL_KEYS.has(key)) {
      topLevelOverrides[key] = value;
    } else {
      benchmarkParams[key] = value;
    }
  });

  const hasParams = Object.keys(benchmarkParams).length > 0;

  const trimmedDatasetUrl = datasetUrl.trim();
  const trimmedAccessToken = accessToken.trim();
  const prerecordedS3Location =
    sourceMode === 'prerecorded' ? parseS3DatasetUrl(trimmedDatasetUrl) : undefined;
  // The S3DataRef contract requires bucket, key, and secret_ref; a prerecorded
  // request is only emitted when all three can be populated.
  const prerecordedDataRef =
    sourceMode === 'prerecorded' && prerecordedS3Location && trimmedAccessToken
      ? {
          // eslint-disable-next-line camelcase
          test_data_ref: {
            type: 'pre_recorded_data' as const,
            s3: {
              bucket: prerecordedS3Location.bucket,
              key: prerecordedS3Location.key,
              // eslint-disable-next-line camelcase
              secret_ref: trimmedAccessToken,
            },
          },
        }
      : {};

  const testDataRefEntry = serializeTestDataRef(testDataRef);
  const modelModeDataRef =
    sourceMode === 'model' && testDataRefEntry
      ? {
          // eslint-disable-next-line camelcase
          test_data_ref: testDataRefEntry,
        }
      : {};

  const benchmarkEntries: NonNullable<CreateEvaluationJobRequest['benchmarks']> = [];

  if (benchmark) {
    benchmarkEntries.push({
      id: benchmark.id,
      // eslint-disable-next-line camelcase
      provider_id: benchmark.providerId,
      // eslint-disable-next-line camelcase
      primary_score: primaryScoreOverride ?? benchmark.primary_score,
      // eslint-disable-next-line camelcase
      pass_criteria: passCriteriaOverride ?? benchmark.pass_criteria,
      ...(hasParams ? { parameters: benchmarkParams } : {}),
      ...prerecordedDataRef,
      ...modelModeDataRef,
    });
  }

  // Mixed collections — creatable only by API clients, since the UI offers no
  // prerecorded selector in collection flows — retain benchmarks that need
  // inference, so the hydrated endpoint and auth are preserved instead of
  // being cleared by prerecorded mode.
  const hasInferenceBenchmark = !!collection?.benchmarks?.some(
    (b) => !isPrerecordedS3TestDataRef(b.test_data_ref),
  );
  const resolvedModelName = (sourceMode === 'prerecorded' ? sourceName : modelName).trim();
  const resolvedUrl = (
    sourceMode === 'prerecorded' && !hasInferenceBenchmark ? '' : endpointUrl
  ).trim();
  const resolvedAuth = (
    sourceMode === 'prerecorded' && !hasInferenceBenchmark ? '' : apiKeySecretRef
  ).trim();

  const rawExperiment = topLevelOverrides.experiment;
  const experimentOverride: Record<string, unknown> | undefined =
    typeof rawExperiment === 'object' && rawExperiment !== null
      ? Object.fromEntries(Object.entries(rawExperiment))
      : undefined;

  const experiment = experimentName
    ? {
        ...experimentOverride,
        name: experimentName,
        ...(experimentTags ? { tags: experimentTags } : {}),
      }
    : experimentOverride;

  const restOverrides = Object.fromEntries(
    Object.entries(topLevelOverrides).filter(([key]) => key !== 'experiment'),
  );

  const isCollectionFlow = !!collection;
  // The reconfigure form exposes one editable dataset URL and secret for the
  // whole prerecorded run, hydrated from the first stored prerecorded
  // reference (see extractReconfigureData). While the user leaves those fields
  // unchanged, each benchmark keeps its own stored reference. When edited, the
  // dimensions apply independently: a location edit replaces the bucket and
  // key everywhere, and a secret edit rotates the secret everywhere — each
  // preserves the other dimension's per-benchmark stored value. Other
  // per-benchmark references (e.g. data_set) are untouched. Legacy refs (no
  // bucket, full s3:// URL in key) are upgraded to the split bucket/key
  // contract even when unedited, since the S3DataRef contract requires bucket.
  // eslint-disable-next-line camelcase
  const editedPrerecordedRef = prerecordedDataRef.test_data_ref;
  const hydrationSource = collection?.benchmarks?.find((b) =>
    isPrerecordedS3TestDataRef(b.test_data_ref),
  )?.test_data_ref?.s3;
  const hydratedDatasetUrl = hydrationSource
    ? hydrationSource.bucket
      ? buildS3DatasetUrl(hydrationSource.bucket, hydrationSource.key ?? '')
      : (hydrationSource.key ?? '')
    : undefined;
  const noHydrationSource = hydratedDatasetUrl === undefined;
  const locationEdited =
    !!editedPrerecordedRef && (noHydrationSource || trimmedDatasetUrl !== hydratedDatasetUrl);
  const secretEdited =
    !!editedPrerecordedRef &&
    (noHydrationSource || trimmedAccessToken !== (hydrationSource?.secret_ref ?? ''));
  const hardwareConfig = hardwareProfile
    ? {
        // eslint-disable-next-line camelcase
        hardware_profile_name: hardwareProfile,
      }
    : queue
      ? { queue: { kind: 'kueue', name: queue } }
      : undefined;

  return {
    name: evaluationName.trim(),
    model: {
      url: resolvedUrl,
      name: resolvedModelName,
      // eslint-disable-next-line camelcase
      ...(resolvedAuth ? { auth: { secret_ref: resolvedAuth } } : {}),
    },
    // eslint-disable-next-line camelcase
    ...(passCriteriaOverride && isCollectionFlow ? { pass_criteria: passCriteriaOverride } : {}),
    ...(isCollectionFlow
      ? {
          collection: {
            id: collection.resource.id,
            benchmarks: collection.benchmarks?.map((b) => {
              const storedRef = b.test_data_ref;
              const effectiveTestDataRef =
                editedPrerecordedRef && storedRef && isPrerecordedS3TestDataRef(storedRef)
                  ? mergePrerecordedRef(
                      storedRef,
                      editedPrerecordedRef,
                      locationEdited,
                      secretEdited,
                    )
                  : storedRef;
              return {
                id: b.id,
                // eslint-disable-next-line camelcase
                provider_id: b.provider_id,
                // eslint-disable-next-line camelcase
                primary_score: b.primary_score,
                // eslint-disable-next-line camelcase
                pass_criteria: b.pass_criteria,
                ...(hasParams || b.parameters
                  ? { parameters: { ...b.parameters, ...benchmarkParams } }
                  : {}),
                // eslint-disable-next-line camelcase
                ...(effectiveTestDataRef ? { test_data_ref: effectiveTestDataRef } : {}),
              };
            }),
          },
        }
      : { benchmarks: benchmarkEntries }),
    ...restOverrides,
    ...(experiment ? { experiment } : {}),
    // eslint-disable-next-line camelcase
    ...(hardwareConfig ? { hardware_config: hardwareConfig } : {}),
  };
};

export default buildEvaluationRequest;
