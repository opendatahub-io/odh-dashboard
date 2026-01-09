import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateVariant } from '@patternfly/react-core';
import { TableBase, useTableColumnSort } from '#~/components/table';
import { RBAC_SUBJECT_KIND_GROUP, RBAC_SUBJECT_KIND_USER } from '#~/concepts/permissions/const';
import { usePermissionsContext } from '#~/concepts/permissions/PermissionsContext';
import { getRoleByRef, getRoleDisplayName } from '#~/concepts/permissions/utils';
import { RoleRef } from '#~/concepts/permissions/types';
import { ClusterRoleKind, RoleBindingKind, RoleBindingSubject, RoleKind } from '#~/k8sTypes';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import SubjectRolesTableRow from './SubjectRolesTableRow';
import { columns } from './columns';
import { SubjectRoleRow } from './types';
import { FilterDataType, SubjectsFilterOptions } from './const';

type SubjectRolesTableBaseProps = {
  ariaLabel: string;
  testId: string;
  rows: SubjectRoleRow[];
  emptyTableView: React.ReactNode;
  onRoleClick?: (roleRef: RoleRef) => void;
  footerRow?: (pageNumber: number) => React.ReactElement | null;
};

const getRowSpans = (rows: SubjectRoleRow[]): number[] => {
  const spans = new Array<number>(rows.length).fill(0);
  for (let i = 0; i < rows.length; ) {
    const { subjectName } = rows[i];
    const groupStart = i;

    while (i < rows.length && rows[i].subjectName === subjectName) {
      i += 1;
    }

    spans[groupStart] = i - groupStart;
  }
  return spans;
};

export const SubjectRolesTableBase: React.FC<SubjectRolesTableBaseProps> = ({
  ariaLabel,
  testId,
  rows: inputRows,
  emptyTableView,
  onRoleClick,
  footerRow,
}) => {
  const sort = useTableColumnSort<SubjectRoleRow>(columns, [], 0);
  const rows = sort.transformData(inputRows);
  const rowSpans = React.useMemo(() => getRowSpans(rows), [rows]);

  return (
    <TableBase
      aria-label={ariaLabel}
      data-testid={testId}
      variant="compact"
      data={rows}
      columns={columns}
      getColumnSort={sort.getColumnSort}
      emptyTableView={emptyTableView}
      rowRenderer={(row, rowIndex) => (
        <SubjectRolesTableRow
          key={row.key}
          row={row}
          subjectNameRowSpan={rowSpans[rowIndex]}
          onRoleClick={onRoleClick}
        />
      )}
      footerRow={footerRow}
    />
  );
};

type SubjectRolesTableProps = {
  subjectKind: 'user' | 'group';
  filterData: FilterDataType;
  onClearFilters: () => void;
  onRoleClick?: (roleRef: RoleRef) => void;
  footerRow?: (pageNumber: number) => React.ReactElement | null;
};

export const buildSubjectRoleRows = (
  subjectKind: SubjectRolesTableProps['subjectKind'],
  filterData: FilterDataType,
  roles: RoleKind[],
  clusterRoles: ClusterRoleKind[],
  roleBindings: RoleBindingKind[],
): SubjectRoleRow[] => {
  const normalizedNameFilter = (filterData[SubjectsFilterOptions.name] ?? '').trim().toLowerCase();
  const normalizedRoleFilter = (filterData[SubjectsFilterOptions.role] ?? '').trim().toLowerCase();
  const subjectK8sKind = subjectKind === 'user' ? RBAC_SUBJECT_KIND_USER : RBAC_SUBJECT_KIND_GROUP;

  const rows: SubjectRoleRow[] = [];
  roleBindings.forEach((rb) => {
    (rb.subjects ?? []).forEach((s: RoleBindingSubject) => {
      if (s.kind !== subjectK8sKind) {
        return;
      }
      if (normalizedNameFilter && !s.name.toLowerCase().includes(normalizedNameFilter)) {
        return;
      }

      const roleRef: RoleRef = { kind: rb.roleRef.kind, name: rb.roleRef.name };
      const role = getRoleByRef(roles, clusterRoles, roleRef);
      const roleDisplayName = getRoleDisplayName(roleRef, role);

      if (normalizedRoleFilter && !roleDisplayName.toLowerCase().includes(normalizedRoleFilter)) {
        return;
      }

      rows.push({
        key: `${rb.metadata.uid ?? rb.metadata.name}:${s.kind}:${s.name}:${rb.roleRef.kind}:${
          rb.roleRef.name
        }`,
        subjectName: s.name,
        roleRef,
        role,
        roleBindingCreationTimestamp: rb.metadata.creationTimestamp,
      });
    });
  });

  return rows;
};

const getAriaLabel = (subjectKind: SubjectRolesTableProps['subjectKind']): string =>
  subjectKind === 'user' ? 'Users roles table' : 'Groups roles table';

const getEmptyStateText = (subjectKind: SubjectRolesTableProps['subjectKind']): string =>
  subjectKind === 'user' ? 'No users have roles assigned.' : 'No groups have roles assigned.';

const getTestId = (subjectKind: SubjectRolesTableProps['subjectKind']): string =>
  `permissions-${subjectKind}-roles-table`;

const SubjectRolesTable: React.FC<SubjectRolesTableProps> = ({
  subjectKind,
  filterData,
  onClearFilters,
  onRoleClick,
  footerRow,
}) => {
  const { roles, clusterRoles, roleBindings } = usePermissionsContext();

  const rows = React.useMemo(
    () =>
      buildSubjectRoleRows(
        subjectKind,
        filterData,
        roles.data,
        clusterRoles.data,
        roleBindings.data,
      ),
    [clusterRoles.data, filterData, roleBindings.data, roles.data, subjectKind],
  );

  const ariaLabel = getAriaLabel(subjectKind);
  const testId = getTestId(subjectKind);
  const emptyStateText = getEmptyStateText(subjectKind);

  const hasActiveFilters = Object.values(filterData).some((v) => (v ?? '').trim().length > 0);
  const emptyTableViewBase = hasActiveFilters ? (
    <DashboardEmptyTableView variant={EmptyStateVariant.sm} onClearFilters={onClearFilters} />
  ) : (
    <EmptyState headingLevel="h3" titleText="No roles assigned" variant={EmptyStateVariant.sm}>
      <EmptyStateBody>{emptyStateText}</EmptyStateBody>
    </EmptyState>
  );

  // When the inline add row is open and the table has no rows (often due to filters),
  // hide the empty state to avoid confusing "No results" messaging while adding.
  const emptyTableView = footerRow && rows.length === 0 ? undefined : emptyTableViewBase;

  return (
    <SubjectRolesTableBase
      ariaLabel={ariaLabel}
      testId={testId}
      rows={rows}
      emptyTableView={emptyTableView}
      onRoleClick={onRoleClick}
      footerRow={footerRow}
    />
  );
};

export default SubjectRolesTable;
