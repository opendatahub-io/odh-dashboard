import * as React from 'react';
import { Pagination, Toolbar, ToolbarContent } from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td, ExpandableRowContent } from '@patternfly/react-table';
import { useTableColumnSort, DashboardEmptyTableView } from '@odh-dashboard/ui-core';
import { GroupOverviewItem } from '~/app/types/subscriptions';
import { URL_PREFIX } from '~/app/utilities/const';
import { groupColumns } from './utils';
import ExpandedModelContent from './ExpandedModelContent';

const RETURN_TO = `${URL_PREFIX}/maas-governance/overview`;

type GroupsTableProps = {
  data: GroupOverviewItem[];
  toolbarContent: React.ReactNode;
  onClearFilters: () => void;
};

const GroupsTable: React.FC<GroupsTableProps> = ({ data, toolbarContent, onClearFilters }) => {
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const sort = useTableColumnSort(groupColumns, [], 0);
  const sorted = sort.transformData(data);
  const maxPage = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, maxPage);
  const pageData = sorted.slice(pageSize * (safePage - 1), pageSize * safePage);

  const allExpanded = pageData.length > 0 && pageData.every((r) => expandedGroups.has(r.name));

  const toggleAll = () =>
    setExpandedGroups((prev) => {
      const keys = pageData.map((r) => r.name);
      return keys.every((k) => prev.has(k))
        ? new Set([...prev].filter((k) => !keys.includes(k)))
        : new Set([...prev, ...keys]);
    });

  const toggleGroup = (name: string) =>
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });

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
      <Table data-testid="groups-table" aria-label="Groups">
        <Thead>
          <Tr>
            <Th
              expand={{
                areAllExpanded: !allExpanded,
                onToggle: toggleAll,
                collapseAllAriaLabel: 'Collapse all groups',
              }}
            />
            {groupColumns.slice(1).map((col, i) => (
              <Th
                key={col.field}
                sort={col.sortable ? sort.getColumnSort(i + 1) : undefined}
                width={col.width}
              >
                {col.label}
              </Th>
            ))}
          </Tr>
        </Thead>
        {pageData.length === 0 ? (
          <Tbody>
            <Tr>
              <Td colSpan={groupColumns.length}>
                <DashboardEmptyTableView onClearFilters={onClearFilters} />
              </Td>
            </Tr>
          </Tbody>
        ) : (
          pageData.map((row, rowIndex) => {
            const isExpanded = expandedGroups.has(row.name);
            return (
              <Tbody
                key={row.name}
                isExpanded={isExpanded}
                data-testid={`overview-group-row-${row.name}`}
              >
                <Tr style={isExpanded ? { borderBottom: 'none' } : undefined}>
                  <Td
                    data-testid="expand-group"
                    expand={{
                      rowIndex,
                      isExpanded,
                      onToggle: () => toggleGroup(row.name),
                    }}
                  />
                  <Td dataLabel={groupColumns[1].label}>
                    <span className="pf-v6-u-font-weight-bold">{row.name}</span>
                  </Td>
                  <Td dataLabel={groupColumns[2].label}>{row.subscriptions.length}</Td>
                  <Td dataLabel={groupColumns[3].label}>{row.authPolicies.length}</Td>
                </Tr>
                <Tr isExpanded={isExpanded}>
                  <Td colSpan={groupColumns.length}>
                    <ExpandableRowContent>
                      <ExpandedModelContent
                        subscriptions={row.subscriptions}
                        policies={row.authPolicies}
                        returnTo={RETURN_TO}
                      />
                    </ExpandableRowContent>
                  </Td>
                </Tr>
              </Tbody>
            );
          })
        )}
      </Table>
      {data.length > 0 && (
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

export default GroupsTable;
