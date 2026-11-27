/* eslint-disable camelcase */
import { MODEL_EVALUATION_TARGETS } from '~/app/pages/const';
import type {
  CollectionBenchmark,
  CollectionGenerationResult,
  CreateCollectionRequest,
  Provider,
} from '~/app/types';

/** Fill omitted recommendation settings from the provider catalog before display or save. */
export const enrichCollectionBenchmark = (
  benchmark: CollectionBenchmark,
  providers: Provider[],
): CollectionBenchmark => {
  const provider = providers.find((item) => item.resource.id === benchmark.provider_id);
  const catalogBenchmark = provider?.benchmarks?.find((item) => item.id === benchmark.id);
  return {
    ...benchmark,
    ...(benchmark.url || !catalogBenchmark?.url ? {} : { url: catalogBenchmark.url }),
    ...(benchmark.primary_score || !catalogBenchmark?.primary_score
      ? {}
      : {
          primary_score: {
            metric: catalogBenchmark.primary_score.metric,
            lower_is_better: catalogBenchmark.primary_score.lower_is_better,
          },
        }),
    ...(benchmark.pass_criteria || !catalogBenchmark?.pass_criteria
      ? {}
      : { pass_criteria: { threshold: catalogBenchmark.pass_criteria.threshold } }),
  };
};

/** Build the collection payload from the generated metadata and the current review selections. */
export const buildGoalCollectionCreateRequest = (
  generatedCollection: CollectionGenerationResult['collection'],
  suiteName: string,
  suiteDescription: string,
  selectedBenchmarks: CollectionBenchmark[],
): CreateCollectionRequest => {
  const generatedMetadata = { ...generatedCollection };
  delete generatedMetadata.description;
  const description = suiteDescription.trim();
  return {
    ...generatedMetadata,
    name: suiteName.trim(),
    ...(description ? { description } : {}),
    evaluation_targets: [...MODEL_EVALUATION_TARGETS],
    benchmarks: selectedBenchmarks.map((benchmark) => ({ ...benchmark })),
  };
};
/* eslint-enable camelcase */
