import { type SecurityInsight } from './securityInsightsTypes';

export type FilterOption = 'evaluation' | 'category' | 'benchmark';

export const FILTER_LABELS: Record<FilterOption, string> = {
  evaluation: 'Evaluation Name',
  category: 'Category',
  benchmark: 'Benchmark',
};

export const FILTER_PLACEHOLDERS: Record<FilterOption, string> = {
  evaluation: 'Filter by Evaluation Name',
  category: 'Filter by Category',
  benchmark: 'Filter by Benchmark',
};

export type SortConfig = {
  index: number;
  direction: 'asc' | 'desc';
};

export const COLUMN_NAMES: Record<number, string> = {
  0: 'Evaluation',
  1: 'Category',
  2: 'Benchmark',
  3: 'Result',
};

export const getFilterValue = (insight: SecurityInsight, filterType: FilterOption): string => {
  switch (filterType) {
    case 'evaluation':
      return insight.evaluation.toLowerCase();
    case 'category':
      return insight.category.toLowerCase();
    case 'benchmark':
      return insight.benchmarkName.toLowerCase();
    default:
      return '';
  }
};

export const getSortableValue = (insight: SecurityInsight, columnIndex: number): string => {
  switch (columnIndex) {
    case 0:
      return insight.evaluation.toLowerCase();
    case 1:
      return insight.category.toLowerCase();
    case 2:
      return insight.benchmarkName.toLowerCase();
    case 3:
      return insight.result.toLowerCase();
    default:
      return '';
  }
};
