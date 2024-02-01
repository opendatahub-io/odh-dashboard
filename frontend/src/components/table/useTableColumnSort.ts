import * as React from 'react';
import { GetColumnSort, SortableData } from './types';

type TableColumnSortProps<DataType> = {
  columns: SortableData<DataType>[];
  sortDirection?: 'asc' | 'desc';
  setSortDirection: (dir: 'asc' | 'desc') => void;
};

type TableColumnSortByFieldProps<DataType> = TableColumnSortProps<DataType> & {
  sortField?: string;
  setSortField: (field: string) => void;
};

type TableColumnSortByIndexProps<DataType> = TableColumnSortProps<DataType> & {
  sortIndex?: number;
  setSortIndex: (index: number) => void;
};

export const getTableColumnSort = <T>({
  columns,
  sortField,
  setSortField,
  ...sortProps
}: TableColumnSortByFieldProps<T>): GetColumnSort =>
  getTableColumnSortByIndex<T>({
    columns,
    sortIndex: columns.findIndex((c) => c.field === sortField),
    setSortIndex: (index: number) => setSortField(String(columns[index].field)),
    ...sortProps,
  });

const getTableColumnSortByIndex =
  <T>({
    columns,
    sortIndex,
    sortDirection,
    setSortIndex,
    setSortDirection,
  }: TableColumnSortByIndexProps<T>): GetColumnSort =>
  (columnIndex: number) =>
    columns[columnIndex].sortable
      ? {
          sortBy: {
            index: sortIndex,
            direction: sortDirection,
            defaultDirection: 'asc',
          },
          onSort: (_event, index, direction) => {
            setSortIndex(index);
            setSortDirection(direction);
          },
          columnIndex,
        }
      : undefined;
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
  getColumnSort: GetColumnSort;
} => {
  const [activeSortIndex, setActiveSortIndex] = React.useState<number | undefined>(
    defaultSortColIndex,
  );
  const [activeSortDirection, setActiveSortDirection] = React.useState<'desc' | 'asc' | undefined>(
    'asc',
  );

  return {
    transformData: (data: T[]): T[] => {
      if (activeSortIndex === undefined) {
        return data;
      }

      return [...data].sort((a, b) => {
        const columnField = columns[activeSortIndex];

        const compute = () => {
          if (typeof columnField.sortable === 'function') {
            return columnField.sortable(a, b, columnField.field);
          }

          if (!columnField.field) {
            // If you lack the field, no auto sorting can be done
            return 0;
          }

          const dataValueA = a[columnField.field as keyof T];
          const dataValueB = b[columnField.field as keyof T];
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
    getColumnSort: getTableColumnSortByIndex<T>({
      columns,
      sortDirection: activeSortDirection,
      setSortDirection: setActiveSortDirection,
      sortIndex: activeSortIndex,
      setSortIndex: setActiveSortIndex,
    }),
  };
};

export default useTableColumnSort;
