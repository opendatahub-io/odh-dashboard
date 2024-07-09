import { RoleBindingSubject } from '~/k8sTypes';

export enum RoleBindingPermissionsRBType {
  USER = 'User',
  GROUP = 'Group',
}

export enum RoleBindingPermissionsRoleType {
  EDIT = 'edit',
  ADMIN = 'admin',
  DEFAULT = 'default',
}

export type RoleBindingSubjectWithRole = RoleBindingSubject & {
  role: RoleBindingPermissionsRoleType;
  roleBindingName: string;
  roleBindingNamespace: string;
};
