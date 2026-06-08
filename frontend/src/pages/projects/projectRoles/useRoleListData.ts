import * as React from 'react';
import type { ClusterRoleKind, RoleKind } from '#~/k8sTypes';
import {
  isDashboardRole,
  getRoleDescription,
  getRoleDisplayName,
} from '#~/concepts/permissions/utils';
import { DEFAULT_CLUSTER_ROLE_NAMES } from '#~/concepts/permissions/const';
import type { RoleRef } from '#~/concepts/permissions/types';
import type { RoleListRow } from './types';

const toRoleListRow = (role: RoleKind | ClusterRoleKind): RoleListRow => {
  const kind = role.kind === 'ClusterRole' ? 'ClusterRole' : 'Role';
  const roleRef: RoleRef = { kind, name: role.metadata.name };
  return {
    key: `${kind}:${role.metadata.name}`,
    roleRef,
    role,
  };
};

const isDefaultClusterRole = (role: ClusterRoleKind): boolean =>
  DEFAULT_CLUSTER_ROLE_NAMES.includes(role.metadata.name.toLowerCase());

const useRoleListData = (
  roles: RoleKind[],
  clusterRoles: ClusterRoleKind[],
  searchFilter: string,
): RoleListRow[] =>
  React.useMemo(() => {
    const dashboardRoles = roles.filter(isDashboardRole).map(toRoleListRow);
    const relevantClusterRoles = clusterRoles
      .filter((cr) => isDashboardRole(cr) || isDefaultClusterRole(cr))
      .map(toRoleListRow);
    const allRows = [...dashboardRoles, ...relevantClusterRoles];

    const normalizedSearch = searchFilter.trim().toLowerCase();
    if (!normalizedSearch) {
      return allRows;
    }

    return allRows.filter((row) => {
      const displayName = getRoleDisplayName(row.roleRef, row.role).toLowerCase();
      const description = (getRoleDescription(row.roleRef, row.role) ?? '').toLowerCase();
      return displayName.includes(normalizedSearch) || description.includes(normalizedSearch);
    });
  }, [roles, clusterRoles, searchFilter]);

export default useRoleListData;
