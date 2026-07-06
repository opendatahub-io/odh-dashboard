import * as React from 'react';
import { useCheckboxTableBase } from '#~/components/table';
import { usePermissionsContext } from '#~/concepts/permissions/PermissionsContext';
import {
  buildGroupRoleMap,
  buildUserRoleMap,
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
import type { SubjectKindSelection } from '#~/pages/projects/projectPermissions/types';
import type { ManageRolesRow } from './columns';
import type { RoleAssignmentChanges } from './types';

type UseManageRolesDataResult = {
  existingSubjectNames: string[];
  rows: ManageRolesRow[];
  selections: RoleRef[];
  toggleSelection: (roleRef: RoleRef) => void;
  trimmedSubjectName: string;
  changes: RoleAssignmentChanges;
  hasChanges: boolean;
};

const useManageRolesData = (
  subjectKind: SubjectKindSelection,
  subjectName: string,
): UseManageRolesDataResult => {
  const { roles, clusterRoles, roleBindings } = usePermissionsContext();
  const trimmedSubjectName = subjectName.trim();

  // Compute existing subject names from role bindings
  const existingSubjectNames = React.useMemo(() => {
    const subjectRoleMap =
      subjectKind === 'user'
        ? buildUserRoleMap(roleBindings.data)
        : buildGroupRoleMap(roleBindings.data);
    return Array.from(subjectRoleMap.keys()).toSorted((a, b) => a.localeCompare(b));
  }, [roleBindings.data, subjectKind]);

  const isExistingSubject = existingSubjectNames.includes(trimmedSubjectName);

  const reversibleRoleRefs = React.useMemo(
    () => getReversibleRoleRefs(roles.data, clusterRoles.data),
    [clusterRoles.data, roles.data],
  );

  const assignedRoleRefs = React.useMemo(() => {
    if (!trimmedSubjectName || !isExistingSubject) {
      return [];
    }
    return getRoleRefsForSubject(roleBindings.data, getSubjectRef(subjectKind, trimmedSubjectName));
  }, [isExistingSubject, roleBindings.data, subjectKind, trimmedSubjectName]);

  const assignedCustomRoleRefs = React.useMemo(
    () => assignedRoleRefs.filter((roleRef) => !hasRoleRef(reversibleRoleRefs, roleRef)),
    [assignedRoleRefs, reversibleRoleRefs],
  );

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

  const rowByKey = React.useMemo(
    () =>
      new Map(
        rows.map((row) => {
          const key = getRoleRefKey(row.roleRef);
          return [key, row];
        }),
      ),
    [rows],
  );

  const changes = React.useMemo<RoleAssignmentChanges>(() => {
    const assignedKeys = new Set(assignedRoleRefs.map((roleRef) => getRoleRefKey(roleRef)));
    const selectedKeys = new Set(selections.map((roleRef) => getRoleRefKey(roleRef)));

    const assigning: ManageRolesRow[] = [];
    selections.forEach((roleRef) => {
      const key = getRoleRefKey(roleRef);
      if (!assignedKeys.has(key)) {
        const row = rowByKey.get(key);
        if (row) {
          assigning.push(row);
        }
      }
    });

    const unassigning: ManageRolesRow[] = [];
    assignedRoleRefs.forEach((roleRef) => {
      const key = getRoleRefKey(roleRef);
      if (!selectedKeys.has(key)) {
        const row = rowByKey.get(key);
        if (row) {
          unassigning.push(row);
        }
      }
    });

    return {
      assigning,
      unassigning,
    };
  }, [assignedRoleRefs, rowByKey, selections]);

  const hasChanges = React.useMemo(() => {
    if (!trimmedSubjectName) {
      return false;
    }
    return changes.assigning.length > 0 || changes.unassigning.length > 0;
  }, [changes, trimmedSubjectName]);

  return {
    existingSubjectNames,
    rows,
    selections,
    toggleSelection,
    trimmedSubjectName,
    changes,
    hasChanges,
  };
};

export default useManageRolesData;
