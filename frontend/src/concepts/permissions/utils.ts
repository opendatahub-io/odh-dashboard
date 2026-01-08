import type {
  ClusterRoleKind,
  RoleBindingKind,
  RoleBindingRoleRef,
  RoleBindingSubject,
  RoleKind,
} from '#~/k8sTypes';
import { KnownLabels } from '#~/k8sTypes';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import {
  DEFAULT_ROLE_DESCRIPTIONS,
  OPENSHIFT_BOOTSTRAPPING_DEFAULT_VALUE,
  OPENSHIFT_BOOTSTRAPPING_LABEL_KEY,
  RBAC_SUBJECT_KIND_GROUP,
  RBAC_SUBJECT_KIND_USER,
} from './const';
import { RoleLabelType, RoleRef, RoleRefKey, SubjectKey, SupportedSubjectRef } from './types';

const isSupportedSubject = (subject: RoleBindingSubject): subject is SupportedSubjectRef =>
  subject.kind === RBAC_SUBJECT_KIND_USER || subject.kind === RBAC_SUBJECT_KIND_GROUP;

export const roleBindingHasSupportedSubject = (
  rb: RoleBindingKind,
  subject: SupportedSubjectRef,
): boolean =>
  (rb.subjects ?? []).some(
    (s) => isSupportedSubject(s) && s.kind === subject.kind && s.name === subject.name,
  );

/**
 * Type guard for RoleBinding subjects.
 *
 * Narrows to User subjects.
 * Note: ServiceAccounts are intentionally ignored for now.
 */
export const isUserSubject = (subject: RoleBindingSubject): subject is SupportedSubjectRef =>
  subject.kind === RBAC_SUBJECT_KIND_USER;

/**
 * Type guard for RoleBinding subjects.
 *
 * Narrows to Group subjects.
 * Note: ServiceAccounts are intentionally ignored for now.
 */
export const isGroupSubject = (subject: RoleBindingSubject): subject is SupportedSubjectRef =>
  subject.kind === RBAC_SUBJECT_KIND_GROUP;

/**
 * Creates a stable string key for a RoleRef.
 *
 * Always include both kind + name to avoid collisions (Role vs ClusterRole can share a name).
 */
export const getRoleRefKey = (roleRef: Pick<RoleBindingRoleRef, 'kind' | 'name'>): RoleRefKey =>
  `${roleRef.kind}:${roleRef.name}`;

/**
 * Creates a stable string key for a RoleBinding subject.
 *
 * Note: The Permissions feature intentionally ignores ServiceAccount subjects for now, but this
 * helper is generic and can be used for any subject kind.
 */
export const getSubjectKey = (subject: Pick<RoleBindingSubject, 'kind' | 'name'>): SubjectKey =>
  `${subject.kind}:${subject.name}`;

/**
 * Returns true if the given RoleRef list contains the target RoleRef.
 *
 * Prefer direct kind+name comparison to avoid collisions between Role and ClusterRole.
 */
export const hasRoleRef = (roleRefs: RoleRef[], target: RoleRef): boolean =>
  roleRefs.some((r) => r.kind === target.kind && r.name === target.name);

/**
 * Classifies a role into a label type for UI presentation.
 *
 * - Dashboard roles: RoleLabelType.Dashboard.
 * - OpenShift default roles: RoleLabelType.OpenshiftDefault (bootstrapped RBAC defaults).
 * - OpenShift custom roles: RoleLabelType.OpenshiftCustom (everything else).
 */
const getRoleLabelType = (role: RoleKind | ClusterRoleKind): RoleLabelType => {
  const labels = role.metadata.labels ?? {};
  if (labels[KnownLabels.DASHBOARD_RESOURCE] === 'true') {
    return RoleLabelType.Dashboard;
  }
  if (labels[OPENSHIFT_BOOTSTRAPPING_LABEL_KEY] === OPENSHIFT_BOOTSTRAPPING_DEFAULT_VALUE) {
    return RoleLabelType.OpenshiftDefault;
  }
  return RoleLabelType.OpenshiftCustom;
};

/**
 * Like getRoleLabelType, but can fall back when the role object isn't readable
 * (e.g. role listing is forbidden).
 *
 * This matches the Permissions UI behavior:
 * - admin/edit ClusterRoles are treated as OpenShift default even when unreadable.
 * - other unreadable roles are treated as OpenShift custom.
 */
export const getRoleLabelTypeForRoleRef = (
  roleRef: RoleRef,
  role?: RoleKind | ClusterRoleKind,
): RoleLabelType => {
  if (role) {
    return getRoleLabelType(role);
  }
  const name = roleRef.name.toLowerCase();
  if (roleRef.kind === 'ClusterRole' && (name === 'admin' || name === 'edit')) {
    return RoleLabelType.OpenshiftDefault;
  }
  return RoleLabelType.OpenshiftCustom;
};

export const getRoleDescription = (
  roleRef: RoleRef,
  role?: RoleKind | ClusterRoleKind,
): string | undefined =>
  DEFAULT_ROLE_DESCRIPTIONS[getRoleRefKey(roleRef)] ??
  role?.metadata.annotations?.['openshift.io/description'];

/**
 * Builds a map of User name -> all RoleBindings that reference that User.
 *
 * This intentionally returns ALL matching RoleBindings so future mutation actions can update every
 * affected RoleBinding (not just one).
 */
export const buildUserRoleMap = (roleBindings: RoleBindingKind[]): Map<string, RoleBindingKind[]> =>
  roleBindings.reduce((map, rb) => {
    (rb.subjects ?? []).forEach((s) => {
      if (!isUserSubject(s)) {
        return;
      }
      const key = s.name;
      const arr = map.get(key);
      if (arr) {
        arr.push(rb);
      } else {
        map.set(key, [rb]);
      }
    });
    return map;
  }, new Map<string, RoleBindingKind[]>());

/**
 * Builds a map of Group name -> all RoleBindings that reference that Group.
 *
 * This intentionally returns ALL matching RoleBindings so future mutation actions can update every
 * affected RoleBinding (not just one).
 */
export const buildGroupRoleMap = (
  roleBindings: RoleBindingKind[],
): Map<string, RoleBindingKind[]> =>
  roleBindings.reduce((map, rb) => {
    (rb.subjects ?? []).forEach((s) => {
      if (!isGroupSubject(s)) {
        return;
      }
      const key = s.name;
      const arr = map.get(key);
      if (arr) {
        arr.push(rb);
      } else {
        map.set(key, [rb]);
      }
    });
    return map;
  }, new Map<string, RoleBindingKind[]>());

/**
 * Returns all RoleBindings that reference the provided subject.
 *
 * This only matches User/Group subjects (ServiceAccounts ignored).
 */
export const getRoleBindingsForSubject = (
  roleBindings: RoleBindingKind[],
  subject: SupportedSubjectRef,
): RoleBindingKind[] => roleBindings.filter((rb) => roleBindingHasSupportedSubject(rb, subject));

/**
 * Returns all RoleBindings that connect a subject to a specific RoleRef (kind + name).
 *
 * The connection can be represented by multiple RoleBindings; callers should update ALL returned
 * RoleBindings when mutating assignments.
 *
 * This only matches User/Group subjects (ServiceAccounts ignored).
 */
export const getRoleBindingsForSubjectAndRoleRef = (
  roleBindings: RoleBindingKind[],
  subject: SupportedSubjectRef,
  roleRef: RoleRef,
): RoleBindingKind[] =>
  roleBindings.filter(
    (rb) =>
      rb.roleRef.kind === roleRef.kind &&
      rb.roleRef.name === roleRef.name &&
      roleBindingHasSupportedSubject(rb, subject),
  );

/**
 * Returns all unique RoleRefs assigned to a subject.
 *
 * Result is always deduped (by kind + name).
 */
export const getRoleRefsForSubject = (
  roleBindings: RoleBindingKind[],
  subject: SupportedSubjectRef,
): RoleRef[] => {
  const seen = new Set<RoleRefKey>();
  const result: RoleRef[] = [];
  roleBindings.forEach((rb) => {
    if (!roleBindingHasSupportedSubject(rb, subject)) {
      return;
    }

    const key = getRoleRefKey(rb.roleRef);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    result.push({ kind: rb.roleRef.kind, name: rb.roleRef.name });
  });
  return result;
};

/**
 * Returns all unique subjects assigned to a role (RoleRef).
 *
 * Result is always deduped and only includes User/Group (ServiceAccount ignored).
 */
export const getSubjectsForRoleRef = (
  roleBindings: RoleBindingKind[],
  roleRef: RoleRef,
): SupportedSubjectRef[] => {
  const seen = new Set<SubjectKey>();
  const result: SupportedSubjectRef[] = [];
  roleBindings
    .filter((rb) => rb.roleRef.kind === roleRef.kind && rb.roleRef.name === roleRef.name)
    .forEach((rb) => {
      (rb.subjects ?? []).forEach((s) => {
        if (!isSupportedSubject(s)) {
          return;
        }
        const key = getSubjectKey(s);
        if (seen.has(key)) {
          return;
        }
        seen.add(key);
        result.push({ kind: s.kind, name: s.name });
      });
    });

  return result;
};

/**
 * Resolves a RoleRef to a RoleKind or ClusterRoleKind, if present in the provided lists.
 *
 * Returns undefined if the referenced role isn't present in the current lists (e.g. RBAC denies
 * listing ClusterRoles and the ref points to a ClusterRole).
 */
export const getRoleByRef = (
  roles: RoleKind[],
  clusterRoles: ClusterRoleKind[],
  roleRef: RoleRef,
): RoleKind | ClusterRoleKind | undefined => {
  if (roleRef.kind === 'Role') {
    return roles.find((r) => r.metadata.name === roleRef.name);
  }
  return clusterRoles.find((r) => r.metadata.name === roleRef.name);
};

/**
 * Returns a user-friendly display name for a Role/ClusterRole reference.
 *
 * Notes:
 * - Prefer OpenShift display-name annotation when `role` is available.
 * - Special-case well-known OpenShift ClusterRoles to make them more readable in the UI.
 */
export const getRoleDisplayName = (roleRef: RoleRef, role?: RoleKind | ClusterRoleKind): string => {
  // Friendly names for well-known OpenShift ClusterRoles
  if (roleRef.kind === 'ClusterRole') {
    const name = (role?.metadata.name ?? roleRef.name).toLowerCase();
    if (name === 'admin') {
      return 'Admin';
    }
    if (name === 'edit') {
      return 'Contributor';
    }
  }

  return role ? getDisplayNameFromK8sResource(role) : roleRef.name;
};
