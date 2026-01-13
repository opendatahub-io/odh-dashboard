import { SortableData } from '#~/components/table/types';

/**
 * Represents a column that can be managed (shown/hidden, reordered)
 */
export interface ManagedColumn {
  /** Unique identifier for the column (typically matches SortableData.field) */
  id: string;
  /** Display label for the column */
  label: string;
  /** Whether the column is currently visible */
  isVisible: boolean;
}

/**
 * Configuration for the useManageColumns hook
 */
export interface UseManageColumnsConfig<T> {
  /** All possible columns (the full column definition) */
  allColumns: SortableData<T>[];
  /** Unique key for localStorage persistence */
  storageKey: string;
  /** Default visible column fields when no localStorage value exists */
  defaultVisibleFields?: string[];
  /** Maximum number of manageable columns that can be visible */
  maxVisibleColumns?: number;
}

/**
 * Return type for the useManageColumns hook
 */
export interface UseManageColumnsResult<T> {
  /** The columns to render in the table, filtered and ordered by visibility settings */
  visibleColumns: SortableData<T>[];
  /** All manageable columns with their current visibility state (for the modal) */
  managedColumns: ManagedColumn[];
  /** Callback to update which columns are visible (called from modal) */
  setVisibleColumnIds: (columnIds: string[]) => void;
  /** The currently visible column IDs (for display purposes like "X of Y selected") */
  visibleColumnIds: string[];
}
