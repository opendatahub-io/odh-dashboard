import * as React from 'react';
import {
  Pagination,
  PaginationProps,
  Skeleton,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core';
import {
  Table,
  Thead,
  Tr,
  Th,
  TableProps,
  Caption,
  Tbody,
  Td,
  TbodyProps,
} from '@patternfly/react-table';
import { EitherNotBoth } from '~/typeHelpers';
import { GetColumnSort, SortableData } from './types';
import { CHECKBOX_FIELD_ID, EXPAND_FIELD_ID, KEBAB_FIELD_ID } from './const';

type Props<DataType> = {
  loading?: boolean;
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
  getColumnSort?: GetColumnSort;
} & EitherNotBoth<
  { disableRowRenderSupport?: boolean },
  { tbodyProps?: TbodyProps & { ref?: React.Ref<HTMLTableSectionElement> } }
> &
  Omit<TableProps, 'ref' | 'data'> &
  Pick<PaginationProps, 'itemCount' | 'onPerPageSelect' | 'onSetPage' | 'page' | 'perPage'>;

export const MIN_PAGE_SIZE = 10;

const defaultPerPageOptions = [
  {
    title: '10',
    value: 10,
  },
  {
    title: '20',
    value: 20,
  },
  {
    title: '30',
    value: 30,
  },
];

const TableBase = <T,>({
  data,
  columns,
  rowRenderer,
  enablePagination,
  toolbarContent,
  emptyTableView,
  caption,
  disableRowRenderSupport,
  selectAll,
  footerRow,
  tbodyProps,
  perPage = 10,
  page = 1,
  onSetPage,
  onPerPageSelect,
  getColumnSort,
  itemCount = 0,
  loading,
  ...props
}: Props<T>): React.ReactElement => {
  const selectAllRef = React.useRef(null);
  const showPagination = enablePagination && itemCount > MIN_PAGE_SIZE;
  const pagination = (variant: 'top' | 'bottom') => (
    <Pagination
      isCompact={enablePagination === 'compact'}
      itemCount={itemCount}
      perPage={perPage}
      page={page}
      onSetPage={onSetPage}
      onPerPageSelect={onPerPageSelect}
      variant={variant}
      widgetId="table-pagination"
      perPageOptions={defaultPerPageOptions}
      titles={{
        paginationAriaLabel: `${variant} pagination`,
      }}
    />
  );

  // Use a reference to store the heights of table rows once loaded
  const tableRef = React.useRef<HTMLTableElement>(null);
  const rowHeightsRef = React.useRef<number[] | undefined>();
  React.useLayoutEffect(() => {
    if (!loading || rowHeightsRef.current == null) {
      const heights: number[] = [];
      const rows = tableRef.current?.querySelectorAll<HTMLTableRowElement>(':scope > tbody > tr');
      rows?.forEach((r) => heights.push(r.offsetHeight));
      rowHeightsRef.current = heights;
    }
  }, [loading]);

  const renderRows = () =>
    loading
      ? // compute the number of items in the upcoming page
        new Array(
          itemCount === 0
            ? rowHeightsRef.current?.length || MIN_PAGE_SIZE
            : Math.max(0, Math.min(perPage, itemCount - perPage * (page - 1))),
        )
          .fill(undefined)
          .map((_, i) => (
            // Set the height to the last known row height or otherwise the same height as the first row.
            // When going to a previous page, the number of rows may be greater than the current.
            <Tr
              key={`skeleton-${i}`}
              style={{ height: rowHeightsRef.current?.[i] || rowHeightsRef.current?.[0] }}
            >
              {columns.map((col) => (
                <Td
                  key={col.field}
                  // assign classes to reserve space
                  className={
                    col.field === CHECKBOX_FIELD_ID || col.field === EXPAND_FIELD_ID
                      ? 'pf-c-table__toggle'
                      : col.field === KEBAB_FIELD_ID
                      ? 'pf-c-table__action'
                      : undefined
                  }
                >
                  {
                    // render placeholders to reserve space
                    col.field === EXPAND_FIELD_ID || col.field === KEBAB_FIELD_ID ? (
                      <div style={{ width: 46 }} />
                    ) : col.field === CHECKBOX_FIELD_ID ? (
                      <div style={{ width: 13 }} />
                    ) : (
                      <Skeleton width="50%" />
                    )
                  }
                </Td>
              ))}
            </Tr>
          ))
      : data.map((row, rowIndex) => rowRenderer(row, rowIndex));

  return (
    <>
      {(toolbarContent || showPagination) && (
        <Toolbar customChipGroupContent={<></>}>
          <ToolbarContent>
            {toolbarContent}
            {showPagination && (
              <ToolbarItem variant="pagination" align={{ default: 'alignRight' }}>
                {pagination('top')}
              </ToolbarItem>
            )}
          </ToolbarContent>
        </Toolbar>
      )}
      <Table {...props} ref={tableRef}>
        {caption && <Caption>{caption}</Caption>}
        <Thead noWrap>
          <Tr>
            {columns.map((col, i) => {
              if (col.field === CHECKBOX_FIELD_ID && selectAll) {
                return (
                  <>
                    <Tooltip
                      key="select-all-checkbox"
                      content="Select all page items"
                      triggerRef={selectAllRef}
                    />
                    <Th
                      ref={selectAllRef}
                      select={{
                        isSelected: selectAll.selected,
                        onSelect: (e, value) => selectAll.onSelect(value),
                      }}
                      // TODO: Log PF bug -- when there are no rows this gets truncated
                      style={{ minWidth: '45px' }}
                    />
                  </>
                );
              }

              return col.label ? (
                <Th
                  key={col.field + i}
                  sort={getColumnSort && col.sortable ? getColumnSort(i) : undefined}
                  width={col.width}
                  info={col.info}
                >
                  {col.label}
                </Th>
              ) : (
                // Table headers cannot be empty for a11y, table cells can -- https://dequeuniversity.com/rules/axe/4.0/empty-table-header
                <Td key={col.field + i} width={col.width} />
              );
            })}
          </Tr>
        </Thead>
        {disableRowRenderSupport ? renderRows() : <Tbody {...tbodyProps}>{renderRows()}</Tbody>}
        {footerRow && footerRow(page)}
      </Table>
      {!loading && emptyTableView && data.length === 0 && (
        <div style={{ padding: 'var(--pf-global--spacer--2xl) 0', textAlign: 'center' }}>
          {emptyTableView}
        </div>
      )}
      {showPagination && (
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem variant="pagination" align={{ default: 'alignRight' }}>
              {pagination('bottom')}
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      )}
    </>
  );
};

export default TableBase;
