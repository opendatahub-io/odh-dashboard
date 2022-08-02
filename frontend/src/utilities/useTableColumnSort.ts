import * as React from 'react';
import { ThProps } from '@patternfly/react-table';

export type SortableData<T> = {
  label: string;
  field: keyof T;
  /**
   * Set to false to disable sort.
   * Set to true to handle string and number fields automatically (everything else is equal).
   * Pass a function that will get the two results and what field needs to be matched.
   * Assume ASC -- the result will be inverted internally if needed.
   */
  sortable: boolean | ((a: T, b: T, keyField: keyof T) => number);
};

/**
 * Using PF Composable Tables, this utility will help with handling sort logic.
 *
 * Use `transformData` on your data before you render rows.
 * Use `getColumnSort` on your Th.sort as you render it (using the index of your column)
 *
 * @see https://www.patternfly.org/v4/components/table
 */
const useTableColumnSort = <T>(
  columns: SortableData<T>[],
  defaultSortColIndex?: number,
): {
  transformData: (data: T[]) => T[];
  getColumnSort: (columnIndex: number) => ThProps['sort'];
} => {
  const [activeSortIndex, setActiveSortIndex] = React.useState<number | undefined>(
    defaultSortColIndex,
  );
  const [activeSortDirection, setActiveSortDirection] = React.useState<
    'desc' | 'asc' | undefined
  >();

  return {
    transformData: (data: T[]): T[] => {
      if (activeSortIndex === undefined) return data;

      return [...data].sort((a, b) => {
        const columnField = columns[activeSortIndex];
        const dataValueA = a[columnField.field];
        const dataValueB = b[columnField.field];

        const compute = () => {
          if (typeof columnField.sortable === 'function') {
            return columnField.sortable(a, b, columnField.field);
          }

          if (typeof dataValueA === 'string' && typeof dataValueB === 'string') {
            return dataValueA.localeCompare(dataValueB);
          }
          if (typeof dataValueA === 'number' && typeof dataValueB === 'number') {
            return dataValueA - dataValueB;
          }
          return 0;
        };

        return compute() * (activeSortDirection === 'desc' ? -1 : 1);
      });
    },
    getColumnSort: (columnIndex: number): ThProps['sort'] =>
      !columns[columnIndex].sortable
        ? undefined
        : {
            sortBy: {
              index: activeSortIndex,
              direction: activeSortDirection,
              defaultDirection: 'asc',
            },
            onSort: (_event, index, direction) => {
              setActiveSortIndex(index);
              setActiveSortDirection(direction);
            },
            columnIndex,
          },
  };
};

export default useTableColumnSort;
