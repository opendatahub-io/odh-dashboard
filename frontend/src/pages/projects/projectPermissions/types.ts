import { RoleRef } from '#~/concepts/permissions/types';
import { ClusterRoleKind, RoleKind } from '#~/k8sTypes';

/**
 * Subject kind selection for UI components (lowercase for form values).
 * Maps to RBAC_SUBJECT_KIND_USER / RBAC_SUBJECT_KIND_GROUP for API calls.
 */
export type SubjectKindSelection = 'user' | 'group';

export type SubjectRoleRow = {
  key: string;
  subjectName: string;
  roleRef: RoleRef;
  role?: RoleKind | ClusterRoleKind;
  roleBindingName: string;
  roleBindingCreationTimestamp?: string;
};

export enum AssignmentStatus {
  CurrentlyAssigned = 'Assigned',
  Assigning = 'Assigning',
  Unassigning = 'Unassigning',
}

/**
 * Types of pending subject changes that may require confirmation.
 * Also used as the reason for showing the discard changes modal.
 */
export enum PendingChangeType {
  Kind = 'kind',
  Clear = 'clear',
  Switch = 'switch',
}

/**
 * Represents a pending subject change that may require confirmation.
 */
export type PendingSubjectChange =
  | { type: PendingChangeType.Kind; newKind: SubjectKindSelection }
  | { type: PendingChangeType.Clear }
  | { type: PendingChangeType.Switch; newName: string };
