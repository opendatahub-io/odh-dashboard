export enum BenchmarkFilterOptions {
  category = 'Category',
  name = 'Name',
  metrics = 'Metrics',
  framework = 'Framework',
}

export type BenchmarkFilterDataType = {
  [BenchmarkFilterOptions.category]: string[];
  [BenchmarkFilterOptions.name]: string;
  [BenchmarkFilterOptions.metrics]: string[];
  [BenchmarkFilterOptions.framework]: string[];
};

export const initialBenchmarkFilterData: BenchmarkFilterDataType = {
  [BenchmarkFilterOptions.category]: [],
  [BenchmarkFilterOptions.name]: '',
  [BenchmarkFilterOptions.metrics]: [],
  [BenchmarkFilterOptions.framework]: [],
};

export const SUITE_EVALUATES_OPTIONS = ['agent', 'guardrails', 'model', 'traces'] as const;

export const COLLECTION_METADATA_OPTIONS = {
  domains: [
    'grounded_document_understanding',
    'instruction_and_output_reliability',
    'knowledge_and_reasoning',
    'multilingual',
    'multimodal',
    'software',
    'tool_use_and_function_calling',
    'trustworthiness',
  ],
  tasks: [
    'abstention',
    'adversarial_injection',
    'call_generation',
    'calibration',
    'citation_attribution',
    'code_generation',
    'code_repair',
    'code_understanding',
    'constraint_following',
    'data_analysis',
    'document_chart_vqa',
    'extraction',
    'full_document_qa',
    'general_visual_reasoning',
    'grounding_discipline',
    'instruction_following',
    'long_context_understanding',
    'rag',
    'reasoning',
    'safety',
    'structured_output',
    'summarization',
    'translation',
  ],
  modalities: ['multimodal', 'text', 'vision'],
  industries: ['financial', 'government', 'health', 'telco'],
} as const;

export type SuiteEvaluatesOption = (typeof SUITE_EVALUATES_OPTIONS)[number];

export const isSuiteEvaluatesOption = (value: unknown): value is SuiteEvaluatesOption => {
  if (typeof value !== 'string') {
    return false;
  }
  return SUITE_EVALUATES_OPTIONS.some((option) => option === value);
};

export enum BenchmarkSortOption {
  DEFAULT = 'default',
  NAME = 'name',
  CATEGORY = 'category',
}

export const benchmarkSortLabels: Record<BenchmarkSortOption, string> = {
  [BenchmarkSortOption.DEFAULT]: 'Default',
  [BenchmarkSortOption.NAME]: 'Name',
  [BenchmarkSortOption.CATEGORY]: 'Category',
};
