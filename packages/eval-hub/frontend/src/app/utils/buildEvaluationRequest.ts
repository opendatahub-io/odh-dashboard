import {
  Collection,
  CollectionBenchmark,
  CreateEvaluationJobRequest,
  FlatBenchmark,
  JobPassCriteria,
  JobPrimaryScore,
  SourceMode,
} from '~/app/types';
import { parseS3Url } from '~/app/utils/common';

type BuildEvaluationRequestParams = {
  evaluationName: string;
  sourceMode: SourceMode;
  benchmark: FlatBenchmark | undefined;
  collection: Collection | undefined;
  modelName: string;
  endpointUrl: string;
  apiKeySecretRef: string;
  datasetUrl: string;
  accessToken: string;
  additionalArgs: Record<string, unknown>;
  experimentName?: string;
  experimentTags?: { key: string; value: string }[];
  passCriteriaOverride?: JobPassCriteria;
  primaryScoreOverride?: JobPrimaryScore;
};

const TOP_LEVEL_KEYS = new Set(['experiment', 'tags', 'custom', 'exports', 'pass_criteria']);

const buildEvaluationRequest = ({
  evaluationName,
  sourceMode,
  benchmark,
  collection,
  modelName,
  endpointUrl,
  apiKeySecretRef,
  datasetUrl,
  accessToken,
  additionalArgs,
  experimentName,
  experimentTags,
  passCriteriaOverride,
  primaryScoreOverride,
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
  const isPrerecorded = sourceMode === 'prerecorded';

  const prerecordedDataRef =
    isPrerecorded && trimmedDatasetUrl
      ? {
          // eslint-disable-next-line camelcase
          test_data_ref: {
            type: 'pre_recorded_data' as const,
            s3: {
              ...parseS3Url(trimmedDatasetUrl),
              // eslint-disable-next-line camelcase
              secret_ref: trimmedAccessToken,
            },
          },
        }
      : {};

  const buildBenchmarkEntry = (
    b: {
      id: string;
      provider_id?: string;
      primary_score?: JobPrimaryScore;
      pass_criteria?: JobPassCriteria;
      parameters?: Record<string, unknown>;
    },
    overrides?: { primaryScore?: JobPrimaryScore; passCriteria?: JobPassCriteria },
  ) => ({
    id: b.id,
    // eslint-disable-next-line camelcase
    provider_id: b.provider_id,
    // eslint-disable-next-line camelcase
    primary_score: overrides?.primaryScore ?? b.primary_score,
    // eslint-disable-next-line camelcase
    pass_criteria: overrides?.passCriteria ?? b.pass_criteria,
    ...(hasParams || b.parameters ? { parameters: { ...b.parameters, ...benchmarkParams } } : {}),
    ...prerecordedDataRef,
  });

  const benchmarkEntries: NonNullable<CreateEvaluationJobRequest['benchmarks']> = [];

  if (benchmark) {
    benchmarkEntries.push(
      buildBenchmarkEntry(
        {
          id: benchmark.id,
          // eslint-disable-next-line camelcase
          provider_id: benchmark.providerId,
          // eslint-disable-next-line camelcase
          primary_score: benchmark.primary_score,
          // eslint-disable-next-line camelcase
          pass_criteria: benchmark.pass_criteria,
        },
        { primaryScore: primaryScoreOverride, passCriteria: passCriteriaOverride },
      ),
    );
  }

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

  const base = {
    name: evaluationName.trim(),
    // eslint-disable-next-line camelcase
    ...(passCriteriaOverride && isCollectionFlow ? { pass_criteria: passCriteriaOverride } : {}),
    ...(isCollectionFlow
      ? {
          collection: {
            id: collection.resource.id,
            benchmarks: collection.benchmarks?.map((b: CollectionBenchmark) =>
              buildBenchmarkEntry(b, { passCriteria: passCriteriaOverride }),
            ),
          },
        }
      : { benchmarks: benchmarkEntries }),
    ...restOverrides,
    ...(experiment ? { experiment } : {}),
  };

  if (isPrerecorded) {
    return base;
  }

  return {
    ...base,
    model: {
      url: endpointUrl.trim(),
      name: modelName.trim(),
      // eslint-disable-next-line camelcase
      ...(apiKeySecretRef.trim() ? { auth: { secret_ref: apiKeySecretRef.trim() } } : {}),
    },
  };
};

export default buildEvaluationRequest;
