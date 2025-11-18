import * as React from 'react';

/**
 * TableProps type matching the structure from useCheckboxTableBase
 */
interface TableProps {
  selectAll: {
    disabled?: boolean;
    tooltip?: string;
    onSelect: (value: boolean) => void;
    selected: boolean;
  };
}

/**
 * Custom hook to track "Select All" checkbox actions in a table
 * This helps distinguish between individual checkbox selections and bulk "Select All" operations
 *
 * @param tableProps - Table props containing the selectAll configuration
 * @returns Object containing wrapped table props and the select-all action flag
 *
 * @example
 * ```tsx
 * const { wrappedTableProps, isSelectAllAction } = useSelectAllTracking(tableProps);
 *
 * // Use wrappedTableProps in the Table component
 * <Table {...wrappedTableProps} />
 *
 * // Check isSelectAllAction in individual row handlers
 * if (!isSelectAllAction) {
 *   // Handle individual selection logic
 * }
 * ```
 */
export const useSelectAllTracking = (
  tableProps: TableProps,
): {
  wrappedTableProps: TableProps;
  isSelectAllAction: boolean;
} => {
  const [isSelectAllAction, setIsSelectAllAction] = React.useState(false);

  // Wrap the selectAll handler to track when "Select All" is used
  const wrappedTableProps = React.useMemo(() => {
    const originalOnSelect = tableProps.selectAll.onSelect;
    return {
      ...tableProps,
      selectAll: {
        ...tableProps.selectAll,
        onSelect: (value: boolean) => {
          // Set flag to indicate this is a "Select All" action
          setIsSelectAllAction(true);
          // Call the original handler
          originalOnSelect(value);
          // Reset the flag after a brief delay to allow individual selections again
          setTimeout(() => setIsSelectAllAction(false), 100);
        },
      },
    };
  }, [tableProps]);

  return {
    wrappedTableProps,
    isSelectAllAction,
  };
};
