import type { ClusterRoleKind, ResourceRule, RoleKind } from '#~/k8sTypes';
import type { RoleRef } from '#~/concepts/permissions/types';

export type LabelEntry = {
  id: string;
  key: string;
  value: string;
};

export type RoleListRow = {
  key: string;
  roleRef: RoleRef;
  role: RoleKind | ClusterRoleKind;
};

export type RuleEntry = ResourceRule & {
  id: string;
};
