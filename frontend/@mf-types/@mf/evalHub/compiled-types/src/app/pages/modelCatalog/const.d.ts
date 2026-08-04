import { type SecurityInsight } from './securityInsightsTypes';
export type FilterOption = 'evaluation' | 'category' | 'benchmark';
export declare const FILTER_LABELS: Record<FilterOption, string>;
export declare const FILTER_PLACEHOLDERS: Record<FilterOption, string>;
export type SortConfig = {
    index: number;
    direction: 'asc' | 'desc';
};
export declare const getFilterValue: (insight: SecurityInsight, filterType: FilterOption) => string;
export declare const getSortableValue: (insight: SecurityInsight, columnIndex: number) => string;
