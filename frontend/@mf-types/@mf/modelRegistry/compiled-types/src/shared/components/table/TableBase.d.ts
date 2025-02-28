import * as React from 'react';
import { PaginationProps, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import { Tr, TableProps, TbodyProps, TrProps } from '@patternfly/react-table';
import { EitherNotBoth } from '~/shared/typeHelpers';
import { GetColumnSort, SortableData } from './types';
type Props<DataType> = {
    loading?: boolean;
    skeletonRowCount?: number;
    skeletonRowProps?: TrProps;
    data: DataType[];
    columns: SortableData<DataType>[];
    subColumns?: SortableData<DataType>[];
    hasNestedHeader?: boolean;
    defaultSortColumn?: number;
    rowRenderer: (data: DataType, rowIndex: number) => React.ReactNode;
    enablePagination?: boolean | 'compact';
    truncateRenderingAt?: number;
    toolbarContent?: React.ReactElement<typeof ToolbarItem | typeof ToolbarGroup>;
    onClearFilters?: () => void;
    bottomToolbarContent?: React.ReactElement<typeof ToolbarItem | typeof ToolbarGroup>;
    emptyTableView?: React.ReactNode;
    caption?: string;
    footerRow?: (pageNumber: number) => React.ReactElement<typeof Tr> | null;
    selectAll?: {
        onSelect: (value: boolean) => void;
        selected: boolean;
        disabled?: boolean;
        tooltip?: string;
    };
    getColumnSort?: GetColumnSort;
    disableItemCount?: boolean;
    hasStickyColumns?: boolean;
} & EitherNotBoth<{
    disableRowRenderSupport?: boolean;
}, {
    tbodyProps?: TbodyProps & {
        ref?: React.Ref<HTMLTableSectionElement>;
    };
}> & Omit<TableProps, 'ref' | 'data'> & Pick<PaginationProps, 'itemCount' | 'onPerPageSelect' | 'onSetPage' | 'page' | 'perPage' | 'perPageOptions' | 'toggleTemplate' | 'onNextClick' | 'onPreviousClick'>;
export declare const MIN_PAGE_SIZE = 10;
declare const TableBase: <T>({ data, columns, subColumns, hasNestedHeader, rowRenderer, enablePagination, toolbarContent, onClearFilters, bottomToolbarContent, emptyTableView, caption, disableRowRenderSupport, selectAll, footerRow, tbodyProps, perPage, page, perPageOptions, onSetPage, onNextClick, onPreviousClick, onPerPageSelect, getColumnSort, itemCount, loading, skeletonRowCount, skeletonRowProps, toggleTemplate, disableItemCount, hasStickyColumns, ...props }: Props<T>) => React.ReactElement;
export default TableBase;
