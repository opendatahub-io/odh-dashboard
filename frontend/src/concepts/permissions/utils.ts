import type { ClusterRoleKind, RoleBindingKind, RoleBindingSubject, RoleKind } from '#~/k8sTypes';
import { KnownLabels } from '#~/k8sTypes';
import { OPENSHIFT_BOOTSTRAPPING_DEFAULT_VALUE, OPENSHIFT_BOOTSTRAPPING_LABEL_KEY } from './const';
import { RoleLabelType, RoleRef, RoleRefKey, SubjectKey, SupportedSubjectRef } from './types';

const isSupportedSubject = (subject: RoleBindingSubject): subject is SupportedSubjectRef =>
  subject.kind === 'User' || subject.kind === 'Group';

/**
 * Type guard for RoleBinding subjects.
 *
 * Narrows to User subjects.
 * Note: ServiceAccounts are intentionally ignored for now.
 */
export const isUserSubject = (subject: RoleBindingSubject): subject is SupportedSubjectRef =>
  subject.kind === 'User';

/**
 * Type guard for RoleBinding subjects.
 *
 * Narrows to Group subjects.
 * Note: ServiceAccounts are intentionally ignored for now.
 */
export const isGroupSubject = (subject: RoleBindingSubject): subject is SupportedSubjectRef =>
  subject.kind === 'Group';

/**
 * Creates a stable string key for a RoleRef.
 *
 * Always include both kind + name to avoid collisions (Role vs ClusterRole can share a name).
 */
export const getRoleRefKey = (roleRef: RoleRef): RoleRefKey => `${roleRef.kind}:${roleRef.name}`;

/**
 * Creates a stable string key for a supported subject reference.
 *
 * Only supports User/Group (ServiceAccount is ignored for now).
 */
export const getSubjectKey = (subject: SupportedSubjectRef): SubjectKey =>
  `${subject.kind}:${subject.name}`;

/**
 * Classifies a role into a label type for UI presentation.
 *
 * - Dashboard roles: RoleLabelType.Dashboard.
 * - OpenShift default roles: RoleLabelType.OpenshiftDefault (bootstrapped RBAC defaults).
 * - OpenShift custom roles: RoleLabelType.OpenshiftCustom (everything else).
 */
export const getRoleLabelType = (role: RoleKind | ClusterRoleKind): RoleLabelType => {
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
): RoleBindingKind[] =>
  roleBindings.filter((rb) =>
    (rb.subjects ?? []).some(
      (s) => isSupportedSubject(s) && s.kind === subject.kind && s.name === subject.name,
    ),
  );

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
      (rb.subjects ?? []).some(
        (s) => isSupportedSubject(s) && s.kind === subject.kind && s.name === subject.name,
      ),
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
  getRoleBindingsForSubject(roleBindings, subject).forEach((rb) => {
    const ref: RoleRef = { kind: rb.roleRef.kind, name: rb.roleRef.name };
    const key = getRoleRefKey(ref);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    result.push(ref);
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
        const subj: SupportedSubjectRef = { kind: s.kind, name: s.name };
        const key = getSubjectKey(subj);
        if (seen.has(key)) {
          return;
        }
        seen.add(key);
        result.push(subj);
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
