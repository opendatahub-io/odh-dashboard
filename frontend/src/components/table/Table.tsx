import {
  Pagination,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
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
import useTableColumnSort, { SortableData } from '~/components/table/useTableColumnSort';
import { CHECKBOX_FIELD_ID } from '~/components/table/const';

type TableProps<DataType> = {
  data: DataType[];
  columns: SortableData<DataType>[];
  defaultSortColumn?: number;
  rowRenderer: (data: DataType, rowIndex: number) => React.ReactNode;
  enablePagination?: boolean;
  minPageSize?: number;
  truncateRenderingAt?: number;
  toolbarContent?: React.ReactElement<typeof ToolbarItem | typeof ToolbarGroup>;
  emptyTableView?: React.ReactNode;
  caption?: string;
  disableRowRenderSupport?: boolean;
  selectAll?: { onSelect: (value: boolean) => void; selected: boolean };
} & Omit<TableComposableProps, 'ref' | 'data'>;

const Table = <T,>({
  data: allData,
  columns,
  defaultSortColumn = 0,
  rowRenderer,
  enablePagination,
  minPageSize = 10,
  truncateRenderingAt = 0,
  toolbarContent,
  emptyTableView,
  caption,
  disableRowRenderSupport,
  selectAll,
  ...props
}: TableProps<T>): React.ReactElement => {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(minPageSize);
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
  useEffect(() => {
    if (data.length === 0) {
      setPage(1);
    }
  }, [data.length]);

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
        <Toolbar customChipGroupContent={<></>}>
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
            {columns.map((col, i) => {
              if (col.field === CHECKBOX_FIELD_ID && selectAll) {
                return (
                  <Th
                    key="select-all-checkbox"
                    select={{
                      isSelected: selectAll.selected,
                      onSelect: (e, value) => selectAll.onSelect(value),
                    }}
                  />
                );
              }

              return col.label ? (
                <Th
                  key={col.field + i}
                  sort={col.sortable ? sort.getColumnSort(i) : undefined}
                  width={col.width}
                >
                  {col.label}
                </Th>
              ) : (
                <Th key={col.field + i} width={col.width} />
              );
            })}
          </Tr>
        </Thead>
        {disableRowRenderSupport ? (
          data.map((row, rowIndex) => rowRenderer(row, rowIndex))
        ) : (
          <Tbody>{data.map((row, rowIndex) => rowRenderer(row, rowIndex))}</Tbody>
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
