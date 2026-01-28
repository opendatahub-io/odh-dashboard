import { RoleRef } from '#~/concepts/permissions/types';
import { ClusterRoleKind, RoleKind } from '#~/k8sTypes';

export type SubjectRoleRow = {
  key: string;
  subjectName: string;
  roleRef: RoleRef;
  role?: RoleKind | ClusterRoleKind;
  roleBindingName: string;
  roleBindingCreationTimestamp?: string;
};
