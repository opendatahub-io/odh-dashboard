export enum BenchmarkFilterOptions {
  category = 'Category',
  name = 'Name',
  metrics = 'Metrics',
}

export type BenchmarkFilterDataType = {
  [BenchmarkFilterOptions.category]: string[];
  [BenchmarkFilterOptions.name]: string;
  [BenchmarkFilterOptions.metrics]: string[];
};

export const initialBenchmarkFilterData: BenchmarkFilterDataType = {
  [BenchmarkFilterOptions.category]: [],
  [BenchmarkFilterOptions.name]: '',
  [BenchmarkFilterOptions.metrics]: [],
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
