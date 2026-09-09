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

export const SUITE_EVALUATES_OPTIONS = ['model', 'agent', 'traces', 'guardrails'] as const;

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
