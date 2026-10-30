import type { Collection } from '~/app/types';

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

export type CuratedCollectionPrerequisite = {
  short: string;
  long: string;
};

export type CuratedCollectionConfig = {
  prerequisite: CuratedCollectionPrerequisite;
  parameters?: Record<string, CuratedCollectionParameterConfig>;
};

export const CURATED_COLLECTION_PREREQUISITES: Partial<Record<string, CuratedCollectionConfig>> = {
  'tool-use-v1': {
    prerequisite: {
      short: 'Requires a model that supports multiple tool/function calls.',
      long: 'The model you are evaluating must support multiple tool/function calls.',
    },
  },
  'multimodal-v1': {
    prerequisite: {
      short: 'Requires a vision-language model that supports image inputs.',
      long: 'The model you are evaluating must be a vision-language model that supports image inputs.',
    },
  },
};

const JUDGE_MODEL_PARAMETER_KEY = 'judge_model';

const judgeModelParameterConfig: CuratedCollectionParameterConfig = {
  required: true,
  description:
    'The language model name used to score and evaluate responses produced by the model under evaluation.',
};

const JUDGE_MODEL_PREREQUISITE: CuratedCollectionPrerequisite = {
  short: 'Requires a judge model.',
  long: 'Requires a judge model in addition to the model you are evaluating. The judge model scores and evaluates the responses produced by the model you are evaluating.',
};

export const getCuratedCollectionConfig = (
  collection: Collection,
): CuratedCollectionConfig | undefined => {
  const hardcoded = CURATED_COLLECTION_PREREQUISITES[collection.resource.id];
  // The API sends judge_model as an empty string, so presence — not truthiness — is the signal.
  const requiresJudgeModel = collection.benchmarks?.some(
    (benchmark) => JUDGE_MODEL_PARAMETER_KEY in (benchmark.parameters ?? {}),
  );
  if (!hardcoded && !requiresJudgeModel) {
    return undefined;
  }
  const prerequisiteParts = [
    hardcoded?.prerequisite,
    requiresJudgeModel ? JUDGE_MODEL_PREREQUISITE : undefined,
  ].filter((part): part is CuratedCollectionPrerequisite => Boolean(part));
  return {
    prerequisite: {
      short: prerequisiteParts.map((part) => part.short).join(' '),
      long: prerequisiteParts.map((part) => part.long).join(' '),
    },
    parameters: requiresJudgeModel
      ? {
          ...hardcoded?.parameters,
          [JUDGE_MODEL_PARAMETER_KEY]: judgeModelParameterConfig,
        }
      : hardcoded?.parameters,
  };
};

export type CuratedEvaluationTarget = keyof typeof CURATED_SUITE_PAGE_CONFIG;

export const isCuratedEvaluationTarget = (
  value: string | undefined,
): value is CuratedEvaluationTarget => value === 'agent' || value === 'model';
