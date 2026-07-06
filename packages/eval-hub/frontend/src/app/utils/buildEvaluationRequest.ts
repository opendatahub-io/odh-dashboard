import {
  Collection,
  CreateEvaluationJobRequest,
  FlatBenchmark,
  JobPassCriteria,
  JobPrimaryScore,
  SourceMode,
} from '~/app/types';

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
  sourceName,
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
  const prerecordedDataRef =
    sourceMode === 'prerecorded' && trimmedDatasetUrl
      ? {
          // eslint-disable-next-line camelcase
          test_data_ref: {
            s3: {
              key: trimmedDatasetUrl,
              // eslint-disable-next-line camelcase
              ...(trimmedAccessToken ? { secret_ref: trimmedAccessToken } : {}),
            },
          },
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
    });
  }

  const resolvedModelName = (sourceMode === 'prerecorded' ? sourceName : modelName).trim();
  const resolvedUrl = (sourceMode === 'prerecorded' ? '' : endpointUrl).trim();
  const resolvedAuth = (sourceMode === 'prerecorded' ? '' : apiKeySecretRef).trim();

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
            benchmarks: collection.benchmarks?.map((b) => ({
              id: b.id,
              // eslint-disable-next-line camelcase
              provider_id: b.provider_id,
              // eslint-disable-next-line camelcase
              primary_score: b.primary_score,
              // eslint-disable-next-line camelcase
              pass_criteria: b.pass_criteria,
            })),
          },
        }
      : { benchmarks: benchmarkEntries }),
    ...restOverrides,
    ...(experiment ? { experiment } : {}),
  };
};

export default buildEvaluationRequest;
