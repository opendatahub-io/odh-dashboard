import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateVariant } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { TableBase } from '#~/components/table';
import { RBAC_SUBJECT_KIND_GROUP, RBAC_SUBJECT_KIND_USER } from '#~/concepts/permissions/const';
import { usePermissionsContext } from '#~/concepts/permissions/PermissionsContext';
import { getRoleByRef, getRoleDisplayName } from '#~/concepts/permissions/utils';
import { RoleRef } from '#~/concepts/permissions/types';
import { ClusterRoleKind, RoleBindingKind, RoleBindingSubject, RoleKind } from '#~/k8sTypes';
import DashboardEmptyTableView from '#~/concepts/dashboard/DashboardEmptyTableView';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import useTableColumnSort from '#~/components/table/useTableColumnSort';
import SubjectRolesTableRow from './SubjectRolesTableRow';
import SubjectRolesRemoveRoleModal from './SubjectRolesRemoveRoleModal';
import { columns } from './columns';
import { SubjectRoleRow } from './types';
import { FilterDataType, SubjectsFilterOptions } from './const';
import { buildRoleBindingSubject, removeSubjectFromRoleBinding } from './roleBindingMutations';
import type { SubjectKindSelection } from './types';

type SubjectRolesTableBaseProps = {
  ariaLabel: string;
  testId: string;
  rows: SubjectRoleRow[];
  emptyTableView: React.ReactNode;
  footerRow?: (pageNumber: number) => React.ReactElement | null;
  rowRenderer: (row: SubjectRoleRow, subjectNameRowSpan: number) => React.ReactNode;
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
      rowRenderer={(row, rowIndex) => (
        <React.Fragment key={row.key}>{rowRenderer(row, rowSpans[rowIndex])}</React.Fragment>
      )}
      footerRow={footerRow}
    />
  );
};

type SubjectRolesTableProps = {
  subjectKind: SubjectKindSelection;
  filterData: FilterDataType;
  onClearFilters: () => void;
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
  footerRow,
}) => {
  const navigate = useNavigate();
  const {
    currentProject: {
      metadata: { name: namespace },
    },
  } = React.useContext(ProjectDetailsContext);
  const { roles, clusterRoles, roleBindings } = usePermissionsContext();

  const [removingRow, setRemovingRow] = React.useState<SubjectRoleRow>();
  const [isRemoving, setIsRemoving] = React.useState(false);
  const [removeError, setRemoveError] = React.useState<Error>();

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

  const findRoleBindingByName = (roleBindingName: string): RoleBindingKind | undefined =>
    roleBindings.data.find((rb) => rb.metadata.name === roleBindingName);

  const handleConfirmRemove = async () => {
    if (!removingRow) {
      return;
    }

    const subject = buildRoleBindingSubject(subjectK8sKind, removingRow.subjectName);
    const rb = findRoleBindingByName(removingRow.roleBindingName);
    if (!rb) {
      setRemoveError(new Error('RoleBinding not found'));
      return;
    }

    setIsRemoving(true);
    setRemoveError(undefined);
    try {
      await removeSubjectFromRoleBinding({ namespace, roleBinding: rb, subject });
      await roleBindings.refresh();
      setRemovingRow(undefined);
    } catch (e) {
      setRemoveError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsRemoving(false);
    }
  };

  const handleManageRoles = (row: SubjectRoleRow) => {
    navigate(`/projects/${namespace}/permissions/assign`, {
      state: {
        subjectKind,
        subjectName: row.subjectName,
      },
    });
  };

  return (
    <>
      <SubjectRolesTableBase
        ariaLabel={ariaLabel}
        testId={testId}
        rows={rows}
        emptyTableView={emptyTableView}
        footerRow={footerRow}
        rowRenderer={(row, rowSpan) => {
          return (
            <SubjectRolesTableRow
              key={row.key}
              row={row}
              subjectNameRowSpan={rowSpan}
              onManageRoles={() => handleManageRoles(row)}
              onRemove={() => {
                setRemoveError(undefined);
                setRemovingRow(row);
              }}
            />
          );
        }}
      />
      {removingRow ? (
        <SubjectRolesRemoveRoleModal
          row={removingRow}
          isSubmitting={isRemoving}
          error={removeError}
          onConfirm={handleConfirmRemove}
          onClose={() => {
            if (!isRemoving) {
              setRemovingRow(undefined);
              setRemoveError(undefined);
            }
          }}
        />
      ) : null}
    </>
  );
};

export default SubjectRolesTable;
