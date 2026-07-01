import * as React from 'react';
import type { ClusterRoleKind, RoleKind } from '#~/k8sTypes';
import {
  isDashboardRole,
  getRoleDescription,
  getRoleDisplayName,
  getRoleLabelTypeForRole,
} from '#~/concepts/permissions/utils';
import { DEFAULT_CLUSTER_ROLE_NAMES } from '#~/concepts/permissions/const';
import { RoleLabelType, type RoleRef } from '#~/concepts/permissions/types';
import { isDefaultRoleRef } from '#~/pages/projects/projectPermissions/utils';
import { getUserLabels } from './labelUtils';
import type { RoleListRow } from './types';

const toRoleListRow = (role: RoleKind | ClusterRoleKind): RoleListRow => {
  const kind = role.kind === 'ClusterRole' ? 'ClusterRole' : 'Role';
  const roleRef: RoleRef = { kind, name: role.metadata.name };
  return {
    key: `${kind}:${role.metadata.name}`,
    roleRef,
    role,
    userLabels: getUserLabels(role.metadata.labels),
  };
};

const isDefaultClusterRole = (role: ClusterRoleKind): boolean =>
  DEFAULT_CLUSTER_ROLE_NAMES.includes(role.metadata.name.toLowerCase());

const getRoleTypeSearchText = (row: RoleListRow): string => {
  const parts: string[] = [];
  const type = getRoleLabelTypeForRole(row.role);
  if (type === RoleLabelType.Dashboard || isDefaultRoleRef(row.roleRef)) {
    parts.push('ai role');
  }
  if (type === RoleLabelType.OpenshiftDefault) {
    parts.push('openshift default role');
  }
  if (type === RoleLabelType.OpenshiftCustom) {
    parts.push('openshift custom role');
  }
  if (row.roleRef.kind === 'ClusterRole') {
    parts.push('cluster role');
  }
  return parts.join(' ');
};

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
      const labelText = Object.entries(row.userLabels)
        .map(([key, value]) => `${key} ${value}`)
        .join(' ')
        .toLowerCase();
      const typeText = getRoleTypeSearchText(row);
      return (
        displayName.includes(normalizedSearch) ||
        description.includes(normalizedSearch) ||
        labelText.includes(normalizedSearch) ||
        typeText.includes(normalizedSearch)
      );
    });
  }, [roles, clusterRoles, searchFilter]);

export default useRoleListData;
