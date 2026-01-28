import * as React from 'react';
import {
  Content,
  ContentVariants,
  FormSection,
  SearchInput,
  ToolbarItem,
} from '@patternfly/react-core';
import { TableBase, useCheckboxTableBase } from '#~/components/table';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import useTableColumnSort from '#~/components/table/useTableColumnSort';
import { usePermissionsContext } from '#~/concepts/permissions/PermissionsContext';
import {
  getRoleByRef,
  getRoleDisplayName,
  getRoleRefKey,
  getRoleRefsForSubject,
  hasRoleRef,
} from '#~/concepts/permissions/utils';
import type { RoleRef } from '#~/concepts/permissions/types';
import {
  getAssignmentStatus,
  getReversibleRoleRefs,
  getSubjectRef,
} from '#~/pages/projects/projectPermissions/utils';
import ManageRolesTableRow from './ManageRolesTableRow';
import { ManageRolesRow, manageRolesColumns } from './columns';

type ManageRolesTableProps = {
  subjectKind: 'user' | 'group';
  subjectName: string;
  existingSubjectNames: string[];
};

const ManageRolesTable: React.FC<ManageRolesTableProps> = ({
  subjectKind,
  subjectName,
  existingSubjectNames,
}) => {
  const { roles, clusterRoles, roleBindings } = usePermissionsContext();
  const trimmedSubjectName = subjectName.trim();
  const isExistingSubject = existingSubjectNames.includes(trimmedSubjectName);

  // Reversible roles are roles that can be re-added from this UI.
  // Admin/Contributor + Roles with the Dashboard label type.
  const reversibleRoleRefs = React.useMemo(
    () => getReversibleRoleRefs(roles.data, clusterRoles.data),
    [clusterRoles.data, roles.data],
  );

  // Role bindings for the subject.
  const assignedRoleRefs = React.useMemo(() => {
    if (!trimmedSubjectName || !isExistingSubject) {
      return [];
    }
    return getRoleRefsForSubject(roleBindings.data, getSubjectRef(subjectKind, trimmedSubjectName));
  }, [isExistingSubject, roleBindings.data, subjectKind, trimmedSubjectName]);

  // Custom roles are roles that are not reversible.
  const assignedCustomRoleRefs = React.useMemo(
    () => assignedRoleRefs.filter((roleRef) => !hasRoleRef(reversibleRoleRefs, roleRef)),
    [assignedRoleRefs, reversibleRoleRefs],
  );

  // All roles that can be assigned to the subject and can be selected in the table.
  const roleRefs = React.useMemo(
    () => [...reversibleRoleRefs, ...assignedCustomRoleRefs],
    [assignedCustomRoleRefs, reversibleRoleRefs],
  );

  const [selectedRoleRefs, setSelectedRoleRefs] = React.useState<RoleRef[]>(assignedRoleRefs);
  const { selections, toggleSelection } = useCheckboxTableBase<RoleRef>(
    roleRefs,
    selectedRoleRefs,
    setSelectedRoleRefs,
    React.useCallback((roleRef) => getRoleRefKey(roleRef), []),
  );
  const [filterText, setFilterText] = React.useState('');

  React.useEffect(() => {
    setSelectedRoleRefs(assignedRoleRefs);
  }, [assignedRoleRefs]);

  const rows: ManageRolesRow[] = React.useMemo(
    () =>
      roleRefs.map((roleRef) => {
        const role = getRoleByRef(roles.data, clusterRoles.data, roleRef);
        const displayName = getRoleDisplayName(roleRef, role);
        const statusLabel = getAssignmentStatus(roleRef, assignedRoleRefs, selections);
        return {
          roleRef,
          role,
          displayName,
          statusLabel,
        };
      }),
    [assignedRoleRefs, clusterRoles.data, roleRefs, roles.data, selections],
  );

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
        Check the role to grant the relevant permissions.
      </Content>
      <TableBase
        data-testid="manage-roles-table"
        aria-label="Manage roles table"
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
              onToggle={toggleSelection}
            />
          );
        }}
      />
    </FormSection>
  );
};

export default ManageRolesTable;
