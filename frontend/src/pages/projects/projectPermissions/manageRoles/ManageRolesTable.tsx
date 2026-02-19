import * as React from 'react';
import {
  Content,
  ContentVariants,
  FormSection,
  SearchInput,
  ToolbarItem,
} from '@patternfly/react-core';
import { TableBase } from '#~/components/table';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import useTableColumnSort from '#~/components/table/useTableColumnSort';
import { getRoleRefKey } from '#~/concepts/permissions/utils';
import type { RoleRef } from '#~/concepts/permissions/types';
import ManageRolesTableRow from './ManageRolesTableRow';
import { ManageRolesRow, manageRolesColumns } from './columns';

type ManageRolesTableProps = {
  subjectName: string;
  rows: ManageRolesRow[];
  selections: RoleRef[];
  onToggle: (roleRef: RoleRef) => void;
};

const ManageRolesTable: React.FC<ManageRolesTableProps> = ({
  subjectName,
  rows,
  selections,
  onToggle,
}) => {
  const trimmedSubjectName = subjectName.trim();
  const [filterText, setFilterText] = React.useState('');

  const filteredRows = React.useMemo(() => {
    const normalized = filterText.trim().toLowerCase();
    if (!normalized) {
      return rows;
    }
    return rows.filter((row) => row.displayName.toLowerCase().includes(normalized));
  }, [filterText, rows]);

  const sort = useTableColumnSort<ManageRolesRow>(manageRolesColumns, [], 1);
  const sortedRows = sort.transformData(filteredRows);

  const onClearFilters = React.useCallback(() => {
    setFilterText('');
  }, [setFilterText]);

  if (!trimmedSubjectName) {
    return null;
  }

  return (
    <FormSection title="Role assignment">
      <Content component={ContentVariants.p}>
        Select roles to assign them to the user or group. Deselect roles to unassign them.
      </Content>
      <TableBase
        data-testid="manage-roles-table"
        aria-label="Manage permissions table"
        data={sortedRows}
        columns={manageRolesColumns}
        getColumnSort={sort.getColumnSort}
        toolbarContent={
          <ToolbarItem style={{ flexBasis: '100%' }}>
            <SearchInput
              aria-label="Find by name"
              placeholder="Find by name"
              value={filterText}
              onChange={(_e, value) => setFilterText(value)}
              onClear={onClearFilters}
              data-testid="manage-roles-filter-input"
            />
          </ToolbarItem>
        }
        emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
        onClearFilters={onClearFilters}
        rowRenderer={(row, rowIndex) => {
          return (
            <ManageRolesTableRow
              key={getRoleRefKey(row.roleRef)}
              rowIndex={rowIndex}
              row={row}
              selections={selections}
              onToggle={onToggle}
            />
          );
        }}
      />
    </FormSection>
  );
};

export default ManageRolesTable;
