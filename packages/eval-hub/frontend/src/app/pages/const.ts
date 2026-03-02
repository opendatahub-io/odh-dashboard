export enum BenchmarkFilterOptions {
  category = 'Category',
  name = 'Name',
  metrics = 'Metrics',
}

export const benchmarkFilterConfig: Record<BenchmarkFilterOptions, string> = {
  [BenchmarkFilterOptions.category]: 'Category',
  [BenchmarkFilterOptions.name]: 'Name',
  [BenchmarkFilterOptions.metrics]: 'Metrics',
};

export type BenchmarkFilterDataType = Record<BenchmarkFilterOptions, string | undefined>;

export const initialBenchmarkFilterData: BenchmarkFilterDataType = {
  [BenchmarkFilterOptions.category]: '',
  [BenchmarkFilterOptions.name]: '',
  [BenchmarkFilterOptions.metrics]: '',
};
