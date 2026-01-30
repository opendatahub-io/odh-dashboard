import type { ClusterRoleKind, RoleKind } from '#~/k8sTypes';
import type { RoleRef, SupportedSubjectRef } from '#~/concepts/permissions/types';
import {
  getRoleLabelTypeForRole,
  getRoleLabelTypeForRoleRef,
  getRoleRefKey,
  hasRoleRef,
} from '#~/concepts/permissions/utils';
import { RBAC_SUBJECT_KIND_GROUP, RBAC_SUBJECT_KIND_USER } from '#~/concepts/permissions/const';
import { RoleLabelType } from '#~/concepts/permissions/types';
import { DEFAULT_ROLE_REFS } from './const';
import { AssignmentStatus } from './types';

const buildDashboardRoleRefs = (roles: RoleKind[], clusterRoles: ClusterRoleKind[]): RoleRef[] => {
  const toRoleRef = (kind: RoleRef['kind'], name: string): RoleRef => ({ kind, name });
  const fromRoles = roles
    .filter((role) => getRoleLabelTypeForRole(role) === RoleLabelType.Dashboard)
    .map((role) => toRoleRef('Role', role.metadata.name));
  const fromClusterRoles = clusterRoles
    .filter((role) => getRoleLabelTypeForRole(role) === RoleLabelType.Dashboard)
    .map((role) => toRoleRef('ClusterRole', role.metadata.name));
  return [...fromRoles, ...fromClusterRoles];
};

// Reversible roles are roles that can be re-added from this UI.
// Today it's limited to the default OpenShift roles we expose in the selector.
export const getReversibleRoleRefs = (
  roles: RoleKind[],
  clusterRoles: ClusterRoleKind[],
): RoleRef[] => {
  const dashboardRoles = buildDashboardRoleRefs(roles, clusterRoles);
  return dedupeRoleRefs([...DEFAULT_ROLE_REFS, ...dashboardRoles]);
};

export const isDefaultRoleRef = (roleRef: RoleRef): boolean =>
  getRoleLabelTypeForRoleRef(roleRef) === RoleLabelType.OpenshiftDefault;

export const isDashboardRole = (role?: RoleKind | ClusterRoleKind): boolean =>
  role ? getRoleLabelTypeForRole(role) === RoleLabelType.Dashboard : false;

export const isAiRole = (roleRef: RoleRef, role?: RoleKind | ClusterRoleKind): boolean =>
  isDefaultRoleRef(roleRef) || isDashboardRole(role);

export const getSubjectRef = (
  subjectKind: 'user' | 'group',
  subjectName: string,
): SupportedSubjectRef => ({
  kind: subjectKind === 'user' ? RBAC_SUBJECT_KIND_USER : RBAC_SUBJECT_KIND_GROUP,
  name: subjectName,
});

export const dedupeRoleRefs = (roleRefs: RoleRef[]): RoleRef[] => {
  const seen = new Set<string>();
  const result: RoleRef[] = [];
  roleRefs.forEach((roleRef) => {
    const key = getRoleRefKey(roleRef);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    result.push(roleRef);
  });
  return result;
};

export const getAssignmentStatus = (
  roleRef: RoleRef,
  assignedRoleRefs: RoleRef[],
  selectedRoleRefs: RoleRef[],
): AssignmentStatus | '' => {
  const wasAssigned = hasRoleRef(assignedRoleRefs, roleRef);
  const isSelected = hasRoleRef(selectedRoleRefs, roleRef);
  if (wasAssigned && isSelected) {
    return AssignmentStatus.CurrentlyAssigned;
  }
  if (!wasAssigned && isSelected) {
    return AssignmentStatus.Assigning;
  }
  if (wasAssigned && !isSelected) {
    return AssignmentStatus.Unassigning;
  }
  return '';
};
