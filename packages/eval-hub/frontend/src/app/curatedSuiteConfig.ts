export const CURATED_SUITE_PAGE_CONFIG = {
  agent: {
    title: 'Agent collections',
    description: 'Select a collection to evaluate your agent.',
  },
  model: {
    title: 'Model collections',
    description: 'Select a collection to evaluate your model.',
  },
} as const;

export const CURATED_COLLECTION_PREREQUISITES: Record<string, string> = {
  'trustworthiness-v1': 'Requires a judge model.',
  'tool-use-v1': 'Requires a model that supports multiple tool/function calls.',
  'multimodal-v1': 'Requires a vision-language model that supports image inputs.',
};

export type CuratedEvaluationTarget = keyof typeof CURATED_SUITE_PAGE_CONFIG;

export const isCuratedEvaluationTarget = (
  value: string | undefined,
): value is CuratedEvaluationTarget => value === 'agent' || value === 'model';
