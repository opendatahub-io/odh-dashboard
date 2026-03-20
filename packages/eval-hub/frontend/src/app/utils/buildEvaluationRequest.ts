import { Collection, CreateEvaluationJobRequest, FlatBenchmark } from '~/app/types';

type BuildEvaluationRequestParams = {
  evaluationName: string;
  description: string;
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
};

const TOP_LEVEL_KEYS = new Set(['experiment', 'tags', 'custom', 'exports', 'pass_criteria']);

const buildEvaluationRequest = ({
  evaluationName,
  description,
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

  const benchmarks: CreateEvaluationJobRequest['benchmarks'] = [];

  if (benchmark) {
    benchmarks.push({
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
  } else if (collection?.benchmarks) {
    collection.benchmarks.forEach((b) => {
      const merged = hasParams ? { ...b.parameters, ...benchmarkParams } : b.parameters;
      benchmarks.push({
        id: b.id,
        // eslint-disable-next-line camelcase
        provider_id: b.provider_id,
        weight: b.weight,
        // eslint-disable-next-line camelcase
        primary_score: b.primary_score,
        // eslint-disable-next-line camelcase
        pass_criteria: b.pass_criteria,
        ...(merged && Object.keys(merged).length > 0 ? { parameters: merged } : {}),
        ...prerecordedDataRef,
      });
    });
  }

  const resolvedModelName = inputMode === 'inference' ? modelName.trim() : sourceName.trim();
  const resolvedUrl = inputMode === 'inference' ? endpointUrl.trim() : '';
  const resolvedAuth = inputMode === 'inference' ? apiKeySecretRef.trim() : '';

  return {
    name: evaluationName.trim(),
    ...(description.trim() ? { description: description.trim() } : {}),
    model: {
      url: resolvedUrl,
      name: resolvedModelName,
      // eslint-disable-next-line camelcase
      ...(resolvedAuth ? { auth: { secret_ref: resolvedAuth } } : {}),
    },
    benchmarks,
    ...(collection ? { collection: { id: collection.resource.id } } : {}),
    ...topLevelOverrides,
  };
};

export default buildEvaluationRequest;
