/* eslint-disable camelcase */
import { MODEL_EVALUATION_TARGETS } from '~/app/pages/const';
import type {
  CollectionBenchmark,
  CollectionGenerationResult,
  CreateCollectionRequest,
} from '~/app/types';

/** Build the collection payload from the generated metadata and the current review selections. */
export const buildGoalSuiteCreateRequest = (
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
