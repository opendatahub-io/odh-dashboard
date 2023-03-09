import { Pagination, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import {
  TableComposable,
  Thead,
  Tr,
  Th,
  TableComposableProps,
  Caption,
  Tbody,
} from '@patternfly/react-table';
import React, { useEffect } from 'react';
import useTableColumnSort, { SortableData } from '~/utilities/useTableColumnSort';

type TableProps<DataType> = {
  data: DataType[];
  columns: SortableData<DataType>[];
  rowRenderer: (data: DataType, rowIndex: number) => React.ReactNode;
  enablePagination?: boolean;
  minPageSize?: number;
  toolbarContent?: React.ReactElement<typeof ToolbarItem>;
  emptyTableView?: React.ReactElement<typeof Tr>;
  caption?: string;
  disableRowRenderSupport?: boolean;
} & Omit<TableComposableProps, 'ref' | 'data'>;

const Table = <T,>({
  data: allData,
  columns,
  rowRenderer,
  enablePagination,
  minPageSize = 10,
  toolbarContent,
  emptyTableView,
  caption,
  disableRowRenderSupport,
  ...props
}: TableProps<T>): React.ReactElement => {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(minPageSize);

  const data = enablePagination ? allData.slice(pageSize * (page - 1), pageSize * page) : allData;

  // update page to 1 if data changes (common when filter is applied)
  useEffect(() => {
    if (data.length === 0) {
      setPage(1);
    }
  }, [data.length]);

  const sort = useTableColumnSort<T>(columns, 0);

  const showPagination = enablePagination && allData.length > minPageSize;
  const pagination = (variant: 'top' | 'bottom') => (
    <Pagination
      perPageComponent="button"
      itemCount={allData.length}
      perPage={pageSize}
      page={page}
      onSetPage={(e, newPage) => setPage(newPage)}
      onPerPageSelect={(e, newSize, newPage) => {
        setPageSize(newSize);
        setPage(newPage);
      }}
      variant={variant}
      widgetId="table-pagination"
    />
  );

  return (
    <>
      {(toolbarContent || showPagination) && (
        <Toolbar>
          <ToolbarContent>
            {toolbarContent}
            {showPagination && (
              <ToolbarItem variant="pagination" alignment={{ default: 'alignRight' }}>
                {pagination('top')}
              </ToolbarItem>
            )}
          </ToolbarContent>
        </Toolbar>
      )}
      <TableComposable {...props}>
        {caption && <Caption>{caption}</Caption>}
        <Thead>
          <Tr>
            {columns.map((col, i) => (
              <Th
                key={col.field + i}
                sort={col.sortable ? sort.getColumnSort(i) : undefined}
                width={col.width}
              >
                {col.label}
              </Th>
            ))}
          </Tr>
        </Thead>
        {disableRowRenderSupport ? (
          sort.transformData(data).map((row, rowIndex) => rowRenderer(row, rowIndex))
        ) : (
          <Tbody>
            {sort.transformData(data).map((row, rowIndex) => rowRenderer(row, rowIndex))}
          </Tbody>
        )}
      </TableComposable>
      {emptyTableView && data.length === 0 && (
        <div style={{ padding: 'var(--pf-global--spacer--2xl) 0', textAlign: 'center' }}>
          {emptyTableView}
        </div>
      )}
      {showPagination && (
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem variant="pagination" alignment={{ default: 'alignRight' }}>
              {pagination('bottom')}
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      )}
    </>
  );
};

export default Table;
