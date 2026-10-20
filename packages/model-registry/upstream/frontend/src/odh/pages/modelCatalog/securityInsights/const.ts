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

export const DEFAULT_TABLE_PER_PAGE = 20;

export const TABLE_PER_PAGE_OPTIONS = [
  { title: '5', value: 5 },
  { title: '10', value: 10 },
  { title: '20', value: 20 },
];

type CategoryColor = 'orange' | 'blue' | 'green' | 'purple' | 'teal' | 'red' | 'yellow';

const CATEGORY_COLOR_PALETTE: CategoryColor[] = [
  'blue',
  'teal',
  'green',
  'purple',
  'orange',
  'red',
  'yellow',
];

export const getCategoryColor = (category?: string): CategoryColor => {
  if (!category) {
    return 'blue';
  }
  const hash = category
    .toLowerCase()
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CATEGORY_COLOR_PALETTE[hash % CATEGORY_COLOR_PALETTE.length];
};

export const capitalizeFirst = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

export const toTitleCase = (value: string): string => {
  if (!value) {
    return value;
  }
  return value
    .split(' ')
    .map((word) => {
      if (word === word.toUpperCase() && word.length > 1) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

// Analytics event names. Kept identical to the eval-hub originals so the segment
// tracking for this tab is continuous across the module move.
export const SECURITY_INSIGHTS_EVENTS = {
  VIEWED: 'Security Insights Viewed',
  FILTER_TYPE_CHANGED: 'Security Insights Filter Type Changed',
  FILTER_APPLIED: 'Security Insights Filter Applied',
  SORT_CHANGED: 'Security Insights Sort Changed',
  PAGINATION_CHANGED: 'Security Insights Pagination Changed',
} as const;
