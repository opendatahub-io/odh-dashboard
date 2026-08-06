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
