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

export type CuratedCollectionParameterConfig = {
  required: boolean;
  description?: string;
};

export type CuratedCollectionConfig = {
  prerequisite: string;
  parameters?: Record<string, CuratedCollectionParameterConfig>;
};

export const CURATED_COLLECTION_PREREQUISITES: Partial<Record<string, CuratedCollectionConfig>> = {
  /* eslint-disable camelcase */
  'trustworthiness-v1': {
    prerequisite: 'Requires a judge model.',
    parameters: {
      judge_model: {
        required: true,
        description:
          'The language model name used to score and evaluate responses produced by the model under evaluation.',
      },
    },
  },
  /* eslint-enable camelcase */
  'tool-use-v1': { prerequisite: 'Requires a model that supports multiple tool/function calls.' },
  'multimodal-v1': { prerequisite: 'Requires a vision-language model that supports image inputs.' },
};

export type CuratedEvaluationTarget = keyof typeof CURATED_SUITE_PAGE_CONFIG;

export const isCuratedEvaluationTarget = (
  value: string | undefined,
): value is CuratedEvaluationTarget => value === 'agent' || value === 'model';
