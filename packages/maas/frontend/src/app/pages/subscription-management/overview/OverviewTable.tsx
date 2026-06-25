import * as React from 'react';
import { Pagination } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Td } from '@patternfly/react-table';
import { useTableColumnSort } from '@odh-dashboard/ui-core';
import { ModelOverviewRow, overviewColumns } from './utils';
import OverviewTableRow from './OverviewTableRow';

const modelKey = (row: ModelOverviewRow): string => `${row.namespace}/${row.name}`;

const OverviewTable: React.FC<{ data: ModelOverviewRow[] }> = ({ data }) => {
  const [expandedModels, setExpandedModels] = React.useState<Set<string>>(new Set());
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const sort = useTableColumnSort(overviewColumns, [], 0);
  const sorted = sort.transformData(data);
  const maxPage = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, maxPage);
  const pageData = sorted.slice(pageSize * (safePage - 1), pageSize * safePage);

  const allExpanded = pageData.length > 0 && pageData.every((r) => expandedModels.has(modelKey(r)));

  const toggleAll = () =>
    setExpandedModels((prev) => {
      const keys = pageData.map(modelKey);
      return keys.every((k) => prev.has(k))
        ? new Set([...prev].filter((k) => !keys.includes(k)))
        : new Set([...prev, ...keys]);
    });

  const toggleModel = (row: ModelOverviewRow) => {
    const key = modelKey(row);
    setExpandedModels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <>
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
                <Td key={col.field} />
              ),
            )}
          </Tr>
        </Thead>
        {pageData.map((row, rowIndex) => (
          <OverviewTableRow
            key={modelKey(row)}
            row={row}
            rowIndex={rowIndex}
            isExpanded={expandedModels.has(modelKey(row))}
            onToggleExpand={() => toggleModel(row)}
          />
        ))}
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
