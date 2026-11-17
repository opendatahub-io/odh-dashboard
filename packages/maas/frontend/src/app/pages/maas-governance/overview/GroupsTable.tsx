import * as React from 'react';
import { Table, DashboardEmptyTableView } from '@odh-dashboard/ui-core';
import { ExpandableRowContent, Tbody, Tr, Td } from '@patternfly/react-table';
import { GroupOverviewItem } from '~/app/types/subscriptions';
import { URL_PREFIX } from '~/app/utilities/const';
import { groupColumns } from './utils';
import ExpandedModelContent from './ExpandedModelContent';

// Keep the groups view in the return target so resource links come back to this view
const RETURN_TO = `${URL_PREFIX}/maas-governance/overview?view=groups`;

type GroupsTableProps = {
  data: GroupOverviewItem[];
  toolbarContent?: React.ReactElement;
  onClearFilters: () => void;
};

const GroupsTable: React.FC<GroupsTableProps> = ({ data, toolbarContent, onClearFilters }) => {
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());

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
    <Table
      data-testid="groups-table"
      aria-label="Groups"
      data={data}
      columns={groupColumns.slice(1)}
      enablePagination
      disableRowRenderSupport
      rowRenderer={(row, rowIndex) => {
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
      }}
      emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
      toolbarContent={toolbarContent}
      onClearFilters={onClearFilters}
    />
  );
};

export default GroupsTable;
