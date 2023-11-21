import * as React from 'react';
import { ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import { TableProps as PFTableProps, TbodyProps, Tr } from '@patternfly/react-table';
import { EitherNotBoth } from '~/typeHelpers';
import TableBase, { MIN_PAGE_SIZE } from './TableBase';
import useTableColumnSort from './useTableColumnSort';
import type { SortableData } from './types';

type TableProps<DataType> = {
  data: DataType[];
  columns: SortableData<DataType>[];
  defaultSortColumn?: number;
  rowRenderer: (data: DataType, rowIndex: number) => React.ReactNode;
  enablePagination?: boolean | 'compact';
  truncateRenderingAt?: number;
  toolbarContent?: React.ReactElement<typeof ToolbarItem | typeof ToolbarGroup>;
  emptyTableView?: React.ReactNode;
  caption?: string;
  footerRow?: (pageNumber: number) => React.ReactElement<typeof Tr> | null;
  selectAll?: { onSelect: (value: boolean) => void; selected: boolean };
} & EitherNotBoth<
  { disableRowRenderSupport?: boolean },
  { tbodyProps?: TbodyProps & { ref?: React.Ref<HTMLTableSectionElement> } }
> &
  Omit<PFTableProps, 'ref' | 'data'>;

const Table = <T,>({
  data: allData,
  columns,
  enablePagination,
  defaultSortColumn = 0,
  truncateRenderingAt = 0,
  ...props
}: TableProps<T>): React.ReactElement => {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(MIN_PAGE_SIZE);
  const sort = useTableColumnSort<T>(columns, defaultSortColumn);
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
      enablePagination={enablePagination}
      itemCount={allData.length}
      perPage={pageSize}
      page={page}
      onSetPage={(e, newPage) => setPage(newPage)}
      onPerPageSelect={(e, newSize, newPage) => {
        setPageSize(newSize);
        setPage(newPage);
      }}
      getColumnSort={sort.getColumnSort}
      {...props}
    />
  );
};

export default Table;
