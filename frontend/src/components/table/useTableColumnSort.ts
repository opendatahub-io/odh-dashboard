import * as React from 'react';
import { GetColumnSort, SortableData } from './types';

type TableColumnSortProps<DataType> = {
  columns: SortableData<DataType>[];
  subColumns?: SortableData<DataType>[];
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
  subColumns,
  sortField,
  setSortField,
  ...sortProps
}: TableColumnSortByFieldProps<T>): GetColumnSort =>
  getTableColumnSortByIndex<T>({
    columns,
    subColumns,
    sortIndex: columns.findIndex((c) => c.field === sortField),
    setSortIndex: (index: number) => setSortField(String(columns[index].field)),
    ...sortProps,
  });

const getTableColumnSortByIndex =
  <T>({
    columns,
    subColumns,
    sortIndex,
    sortDirection,
    setSortIndex,
    setSortDirection,
  }: TableColumnSortByIndexProps<T>): GetColumnSort =>
  (columnIndex: number) =>
    (columnIndex < columns.length
      ? columns[columnIndex]
      : subColumns?.[columnIndex - columns.length]
    )?.sortable
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
  subColumns: SortableData<T>[],
  defaultSortColIndex?: number,
  enableCustomOrder?: boolean,
): {
  transformData: (data: T[]) => T[];
  getColumnSort: GetColumnSort;
  isCustomOrder: boolean;
} => {
  const [activeSortIndex, setActiveSortIndex] = React.useState<number | undefined>(
    enableCustomOrder ? undefined : defaultSortColIndex,
  );
  const [activeSortDirection, setActiveSortDirection] = React.useState<
    'desc' | 'asc' | 'custom' | undefined
  >(enableCustomOrder ? 'custom' : 'asc');

  const isCustomOrder = enableCustomOrder && activeSortDirection === 'custom';

  const createCustomColumnSort = (): GetColumnSort => {
    return (columnIndex: number) => {
      const column =
        columnIndex < columns.length
          ? columns[columnIndex]
          : subColumns[columnIndex - columns.length];

      if (!column.sortable) {
        return undefined;
      }

      return {
        sortBy: {
          index: activeSortIndex,
          direction: activeSortDirection === 'custom' ? undefined : activeSortDirection,
          defaultDirection: 'asc',
        },
        onSort: (_event, index) => {
          // If user clicked a different column, start at asc for that column.
          if (activeSortDirection !== 'custom' && index !== activeSortIndex) {
            setActiveSortIndex(index);
            setActiveSortDirection('asc');
          } else if (activeSortDirection === 'custom') {
            setActiveSortIndex(index);
            setActiveSortDirection('asc');
          } else if (activeSortDirection === 'asc') {
            setActiveSortDirection('desc');
          } else {
            setActiveSortIndex(undefined);
            setActiveSortDirection('custom');
          }
        },
        columnIndex,
      };
    };
  };

  const createStandardColumnSort = (): GetColumnSort => {
    return getTableColumnSortByIndex<T>({
      columns,
      subColumns,
      sortDirection: activeSortDirection === 'custom' ? undefined : activeSortDirection,
      setSortDirection: (dir: 'asc' | 'desc') => {
        setActiveSortDirection(dir);
      },
      sortIndex: activeSortIndex,
      setSortIndex: setActiveSortIndex,
    });
  };

  return {
    transformData: (data: T[]): T[] => {
      if (activeSortIndex === undefined || activeSortDirection === 'custom') {
        return data;
      }

      return data.toSorted((a, b) => {
        const columnField =
          activeSortIndex < columns.length
            ? columns[activeSortIndex]
            : subColumns[activeSortIndex - columns.length];

        const compute = () => {
          if (typeof columnField.sortable === 'function') {
            return columnField.sortable(a, b, columnField.field);
          }

          if (!columnField.field) {
            // If you lack the field, no auto sorting can be done
            return 0;
          }

          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          const dataValueA = a[columnField.field as keyof T];
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
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
    getColumnSort: enableCustomOrder ? createCustomColumnSort() : createStandardColumnSort(),
    isCustomOrder: isCustomOrder ?? false,
  };
};

export default useTableColumnSort;
