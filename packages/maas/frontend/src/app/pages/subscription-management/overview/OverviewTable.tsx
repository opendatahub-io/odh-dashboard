import * as React from 'react';
import { Pagination, Toolbar, ToolbarContent } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { useTableColumnSort, DashboardEmptyTableView } from '@odh-dashboard/ui-core';
import { ModelOverviewItem } from '~/app/types/subscriptions';
import { overviewColumns } from './utils';
import OverviewTableRow from './OverviewTableRow';

type OverviewTableProps = {
  data: ModelOverviewItem[];
  toolbarContent: React.ReactNode;
  onClearFilters: () => void;
};

const OverviewTable: React.FC<OverviewTableProps> = ({ data, toolbarContent, onClearFilters }) => {
  const [expandedModels, setExpandedModels] = React.useState<Set<string>>(new Set());
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const sort = useTableColumnSort(overviewColumns, [], 0);
  const sorted = sort.transformData(data);
  const maxPage = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, maxPage);
  const pageData = sorted.slice(pageSize * (safePage - 1), pageSize * safePage);

  const allExpanded = pageData.length > 0 && pageData.every((r) => expandedModels.has(r.id));

  const toggleAll = () =>
    setExpandedModels((prev) => {
      const keys = pageData.map((r) => r.id);
      return keys.every((k) => prev.has(k))
        ? new Set([...prev].filter((k) => !keys.includes(k)))
        : new Set([...prev, ...keys]);
    });

  const toggleModel = (row: ModelOverviewItem) => {
    setExpandedModels((prev) => {
      const next = new Set(prev);
      if (next.has(row.id)) {
        next.delete(row.id);
      } else {
        next.add(row.id);
      }
      return next;
    });
  };

  return (
    <>
      {toolbarContent && (
        <Toolbar
          inset={{ default: 'insetNone' }}
          className="pf-v6-u-w-100"
          clearAllFilters={onClearFilters}
        >
          <ToolbarContent>{toolbarContent}</ToolbarContent>
        </Toolbar>
      )}
      <Table data-testid="overview-table">
        <Thead>
          <Tr>
            <Th
              expand={{
                areAllExpanded: !allExpanded,
                onToggle: toggleAll,
                collapseAllAriaLabel: 'Collapse all models',
              }}
            />
            {overviewColumns.slice(1).map((col, i) =>
              col.label ? (
                <Th
                  key={col.field}
                  sort={col.sortable ? sort.getColumnSort(i + 1) : undefined}
                  width={col.width}
                >
                  {col.label}
                </Th>
              ) : (
                <Th key={col.field} />
              ),
            )}
          </Tr>
        </Thead>
        {pageData.length === 0 ? (
          <Tbody>
            <Tr>
              <Td colSpan={overviewColumns.length}>
                <DashboardEmptyTableView onClearFilters={onClearFilters} />
              </Td>
            </Tr>
          </Tbody>
        ) : (
          pageData.map((row, rowIndex) => (
            <OverviewTableRow
              key={row.id}
              row={row}
              rowIndex={rowIndex}
              isExpanded={expandedModels.has(row.id)}
              onToggleExpand={() => toggleModel(row)}
            />
          ))
        )}
      </Table>
      {data.length > pageSize && (
        <Pagination
          itemCount={data.length}
          perPage={pageSize}
          page={safePage}
          onSetPage={(_, p) => setPage(p)}
          onPerPageSelect={(_, size, p) => {
            setPageSize(size);
            setPage(p);
          }}
          variant="bottom"
        />
      )}
    </>
  );
};

export default OverviewTable;
