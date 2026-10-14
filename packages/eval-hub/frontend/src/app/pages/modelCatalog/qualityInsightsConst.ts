import { type QualityInsight } from './qualityInsightsTypes';

export type QualityFilterOption = 'evaluation' | 'category' | 'benchmark';

export const QUALITY_FILTER_LABELS: Record<QualityFilterOption, string> = {
  evaluation: 'Evaluation name',
  category: 'Category',
  benchmark: 'Benchmark',
};

export const QUALITY_FILTER_PLACEHOLDERS: Record<QualityFilterOption, string> = {
  evaluation: 'Filter by evaluation name',
  category: 'Filter by category',
  benchmark: 'Filter by benchmark',
};

export type QualitySortConfig = {
  index: number;
  direction: 'asc' | 'desc';
};

export const QUALITY_COLUMN_NAMES: Record<number, string> = {
  0: 'Evaluation',
  1: 'Category',
  2: 'Benchmark',
  3: 'Evaluation score',
};

export const getQualityFilterValue = (
  insight: QualityInsight,
  filterType: QualityFilterOption,
): string => {
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

export const getQualitySortableValue = (
  insight: QualityInsight,
  columnIndex: number,
): string | number | undefined => {
  switch (columnIndex) {
    case 0:
      return insight.evaluation.toLowerCase();
    case 1:
      return insight.category.toLowerCase();
    case 2:
      return insight.benchmarkName.toLowerCase();
    case 3:
      return insight.score;
    default:
      return '';
  }
};
