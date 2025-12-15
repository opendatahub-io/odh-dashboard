import React from 'react';
import { ColumnId } from './types';

interface UseColumnSelectionProps {
  /**
   * All available column IDs
   */
  availableColumns: ColumnId[];
  /**
   * localStorage key to persist selections
   */
  localStorageKey: string;
  /**
   * Default selected columns (used when no localStorage value exists)
   * If not provided, defaults to the first two available columns
   */
  defaultSelectedColumns?: ColumnId[];
}

export const useColumnSelection = ({
  availableColumns,
  localStorageKey,
  defaultSelectedColumns,
}: UseColumnSelectionProps): {
  selectedColumns: ColumnId[];
  updateSelectedColumns: (columnIds: ColumnId[]) => void;
} => {
  const storedValue = localStorage.getItem(localStorageKey);
  const storedColumns: ColumnId[] | undefined = storedValue ? JSON.parse(storedValue) : undefined;

  // Default to first two columns if no default provided
  const computedDefaults = React.useMemo(() => {
    if (defaultSelectedColumns) {
      return defaultSelectedColumns;
    }
    return availableColumns.slice(0, 2);
  }, [defaultSelectedColumns, availableColumns]);

  const selectedColumns = storedColumns ?? computedDefaults;

  // Set default columns in localStorage when no prior stored columns exist
  React.useEffect(() => {
    if (!storedColumns && computedDefaults.length > 0) {
      localStorage.setItem(localStorageKey, JSON.stringify(computedDefaults));
    }
  }, [computedDefaults, localStorageKey, storedColumns]);

  const updateSelectedColumns = React.useCallback(
    (columnIds: ColumnId[]) => {
      localStorage.removeItem(localStorageKey);
      localStorage.setItem(localStorageKey, JSON.stringify(columnIds));
    },
    [localStorageKey],
  );

  return {
    selectedColumns,
    updateSelectedColumns,
  };
};
