import { RoleLabelType, RoleRef } from '#~/concepts/permissions/types';
import { ClusterRoleKind, RoleKind } from '#~/k8sTypes';

export type SubjectRoleRow = {
  key: string;
  subjectName: string;
  roleRef: RoleRef;
  role?: RoleKind | ClusterRoleKind;
  roleBindingCreationTimestamp?: string;
};

export type RoleDisplay = {
  name: string;
  labelType?: RoleLabelType;
  description?: React.ReactNode;
};
