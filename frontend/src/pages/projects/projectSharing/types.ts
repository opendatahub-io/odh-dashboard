import { RoleBindingSubject } from '~/k8sTypes';

export enum ProjectSharingRBType {
  USER = 'User',
  GROUP = 'Group',
}

export enum ProjectSharingRoleType {
  EDIT = 'edit',
  ADMIN = 'admin',
}

export type RoleBindingSubjectWithRole = RoleBindingSubject & {
  role: ProjectSharingRoleType;
  roleBindingName: string;
  roleBindingNamespace: string;
};
