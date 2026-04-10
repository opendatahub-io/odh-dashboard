import { Collection, CreateEvaluationJobRequest, FlatBenchmark } from '~/app/types';

type BuildEvaluationRequestParams = {
  evaluationName: string;
  inputMode: 'inference' | 'prerecorded';
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
};

const TOP_LEVEL_KEYS = new Set(['experiment', 'tags', 'custom', 'exports', 'pass_criteria']);

const buildEvaluationRequest = ({
  evaluationName,
  inputMode,
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

  const prerecordedDataRef =
    inputMode === 'prerecorded' && datasetUrl.trim()
      ? {
          // eslint-disable-next-line camelcase
          test_data_ref: {
            s3: {
              key: datasetUrl.trim(),
              // eslint-disable-next-line camelcase
              ...(accessToken.trim() ? { secret_ref: accessToken.trim() } : {}),
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
      primary_score: benchmark.primary_score,
      // eslint-disable-next-line camelcase
      pass_criteria: benchmark.pass_criteria,
      ...(hasParams ? { parameters: benchmarkParams } : {}),
      ...prerecordedDataRef,
    });
  }

  const resolvedModelName = inputMode === 'inference' ? modelName.trim() : sourceName.trim();
  const resolvedUrl = inputMode === 'inference' ? endpointUrl.trim() : '';
  const resolvedAuth = inputMode === 'inference' ? apiKeySecretRef.trim() : '';

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
