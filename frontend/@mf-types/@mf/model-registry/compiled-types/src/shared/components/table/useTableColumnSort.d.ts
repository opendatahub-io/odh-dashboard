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
export declare const getTableColumnSort: <T>({ columns, subColumns, sortField, setSortField, ...sortProps }: TableColumnSortByFieldProps<T>) => GetColumnSort;
/**
 * Using PF Composable Tables, this utility will help with handling sort logic.
 *
 * Use `transformData` on your data before you render rows.
 * Use `getColumnSort` on your Th.sort as you render it (using the index of your column)
 *
 * @see https://www.patternfly.org/v4/components/table
 */
declare const useTableColumnSort: <T>(columns: SortableData<T>[], subColumns: SortableData<T>[], defaultSortColIndex?: number) => {
    transformData: (data: T[]) => T[];
    getColumnSort: GetColumnSort;
};
export default useTableColumnSort;
