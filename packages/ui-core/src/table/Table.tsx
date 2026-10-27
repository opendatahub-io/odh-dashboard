import * as React from 'react';
import type { EitherNotBoth } from '@odh-dashboard/foundation';
import { TbodyProps } from '@patternfly/react-table';
import TableBase, { MIN_PAGE_SIZE } from './TableBase';
import useTableColumnSort from './useTableColumnSort';

type TableProps<DataType> = Omit<
  React.ComponentProps<typeof TableBase<DataType>>,
  'itemCount' | 'onPerPageSelect' | 'onSetPage' | 'page' | 'perPage'
> & {
  onSort?: (columnIndex: number, direction: 'asc' | 'desc') => void;
  onPagination?: (action: 'first' | 'previous' | 'next' | 'last', currentPage: number) => void;
} & EitherNotBoth<
    { disableRowRenderSupport?: boolean },
    { tbodyProps?: TbodyProps & { ref?: React.Ref<HTMLTableSectionElement> } }
  >;

const Table = <T,>({
  data: allData,
  columns,
  subColumns,
  enablePagination,
  defaultSortColumn = 0,
  onSort,
  onPagination,
  truncateRenderingAt = 0,
  ...props
}: TableProps<T>): React.ReactElement => {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(MIN_PAGE_SIZE);
  const sort = useTableColumnSort<T>(columns, subColumns || [], defaultSortColumn, false, onSort);
  const sortedData = sort.transformData(allData);

  let data: T[];
  if (truncateRenderingAt) {
    data = sortedData.slice(0, truncateRenderingAt);
  } else if (enablePagination) {
    data = sortedData.slice(pageSize * (page - 1), pageSize * page);
  } else {
    data = sortedData;
  }

  // update page to 1 if data changes (common when filter is applied)
  React.useEffect(() => {
    if (data.length === 0) {
      setPage(1);
    }
  }, [data.length]);

  return (
    <TableBase
      data={data}
      columns={columns}
      subColumns={subColumns}
      enablePagination={enablePagination}
      itemCount={allData.length}
      perPage={pageSize}
      page={page}
      onSetPage={(e, newPage) => {
        const action = newPage < page ? 'previous' : 'next';
        setPage(newPage);
        onPagination?.(action, newPage);
      }}
      onPerPageSelect={(e, newSize, newPage) => {
        setPageSize(newSize);
        setPage(newPage);
      }}
      getColumnSort={sort.getColumnSort}
      onFirstClick={(_event, newPage) => {
        setPage(newPage);
        onPagination?.('first', newPage);
      }}
      onPreviousClick={(_event, newPage) => {
        setPage(newPage);
        onPagination?.('previous', newPage);
      }}
      onNextClick={(_event, newPage) => {
        setPage(newPage);
        onPagination?.('next', newPage);
      }}
      onLastClick={(_event, newPage) => {
        setPage(newPage);
        onPagination?.('last', newPage);
      }}
      {...props}
    />
  );
};

export default Table;
