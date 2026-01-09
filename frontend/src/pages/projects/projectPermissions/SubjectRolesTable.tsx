import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateVariant } from '@patternfly/react-core';
import { TableBase, useTableColumnSort } from '#~/components/table';
import { RBAC_SUBJECT_KIND_GROUP, RBAC_SUBJECT_KIND_USER } from '#~/concepts/permissions/const';
import { usePermissionsContext } from '#~/concepts/permissions/PermissionsContext';
import { getRoleByRef, getRoleDisplayName } from '#~/concepts/permissions/utils';
import { RoleRef } from '#~/concepts/permissions/types';
import { ClusterRoleKind, RoleBindingKind, RoleBindingSubject, RoleKind } from '#~/k8sTypes';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import SubjectRolesTableRow from './SubjectRolesTableRow';
import SubjectRolesEditRow from './SubjectRolesEditRow';
import { columns } from './columns';
import { SubjectRoleRow } from './types';
import { FilterDataType, SubjectsFilterOptions } from './const';
import { getEditableRoleRefOptions, isReversibleRoleRef } from './utils';
import { useRoleAssignmentData } from './useRoleAssignmentData';
import { moveSubjectRoleBinding } from './roleBindingMutations';

type SubjectRolesTableBaseProps = {
  ariaLabel: string;
  testId: string;
  rows: SubjectRoleRow[];
  emptyTableView: React.ReactNode;
  onRoleClick?: (roleRef: RoleRef) => void;
  footerRow?: (pageNumber: number) => React.ReactElement | null;
  rowRenderer?: (
    row: SubjectRoleRow,
    rowIndex: number,
    subjectNameRowSpan: number,
  ) => React.ReactNode;
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
  rowRenderer,
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
      rowRenderer={(row, rowIndex) =>
        rowRenderer ? (
          <React.Fragment key={row.key}>
            {rowRenderer(row, rowIndex, rowSpans[rowIndex])}
          </React.Fragment>
        ) : (
          <SubjectRolesTableRow
            key={row.key}
            row={row}
            subjectNameRowSpan={rowSpans[rowIndex]}
            onRoleClick={onRoleClick}
            onEdit={() => undefined}
            onRemove={() => undefined}
          />
        )
      }
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
        roleBindingName: rb.metadata.name,
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
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const { roles, clusterRoles, roleBindings } = usePermissionsContext();
  const { assignedRolesBySubject } = useRoleAssignmentData(subjectKind);

  const [editingRowKey, setEditingRowKey] = React.useState<string>();

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

  const subjectK8sKind = subjectKind === 'user' ? RBAC_SUBJECT_KIND_USER : RBAC_SUBJECT_KIND_GROUP;

  const handleSaveEdit = React.useCallback(
    async (row: SubjectRoleRow, nextRoleRef: RoleRef) => {
      const namespace = currentProject.metadata.name;
      const subject: RoleBindingSubject = {
        kind: subjectK8sKind,
        apiGroup: 'rbac.authorization.k8s.io',
        name: row.subjectName,
      };

      const oldRb = roleBindings.data.find((rb) => rb.metadata.name === row.roleBindingName);
      if (!oldRb) {
        throw new Error('RoleBinding not found');
      }

      await moveSubjectRoleBinding({
        roleBindings: roleBindings.data,
        namespace,
        subjectKind: subjectK8sKind,
        subject,
        fromRoleBinding: oldRb,
        toRoleRef: nextRoleRef,
      });

      await roleBindings.refresh();
      setEditingRowKey(undefined);
    },
    [currentProject.metadata.name, roleBindings, subjectK8sKind],
  );

  return (
    <SubjectRolesTableBase
      ariaLabel={ariaLabel}
      testId={testId}
      rows={rows}
      emptyTableView={emptyTableView}
      onRoleClick={onRoleClick}
      footerRow={footerRow}
      rowRenderer={(row, rowIndex, rowSpan) => {
        if (row.key === editingRowKey) {
          const assigned = assignedRolesBySubject.get(row.subjectName) ?? [];
          const assignedWithoutCurrent = assigned.filter(
            (r) => !(r.kind === row.roleRef.kind && r.name === row.roleRef.name),
          );
          const availableRoles = getEditableRoleRefOptions(row.roleRef);

          return (
            <SubjectRolesEditRow
              key={row.key}
              row={row}
              subjectKind={subjectKind}
              subjectNameRowSpan={rowSpan}
              availableRoles={availableRoles}
              assignedRoles={assignedWithoutCurrent}
              onCancel={() => setEditingRowKey(undefined)}
              onSave={(next) => handleSaveEdit(row, next)}
            />
          );
        }

        return (
          <SubjectRolesTableRow
            key={row.key}
            row={row}
            subjectNameRowSpan={rowSpan}
            onRoleClick={onRoleClick}
            onEdit={() => {
              if (isReversibleRoleRef(row.roleRef)) {
                setEditingRowKey(row.key);
              }
            }}
            onRemove={() => undefined}
          />
        );
      }}
    />
  );
};

export default SubjectRolesTable;
