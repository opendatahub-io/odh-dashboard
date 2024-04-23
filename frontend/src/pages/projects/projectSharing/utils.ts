import { RoleBindingKind } from '~/k8sTypes';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { ProjectSharingRBType, ProjectSharingRoleType } from './types';

export const getRoleBindingResourceName = (roleBinding: RoleBindingKind): string =>
  roleBinding.metadata.name || '';
export const getRoleBindingDisplayName = (roleBinding: RoleBindingKind): string =>
  getDisplayNameFromK8sResource(roleBinding);

export const filterRoleBindingSubjects = (
  roleBindings: RoleBindingKind[],
  type: ProjectSharingRBType,
): RoleBindingKind[] => roleBindings.filter((roles) => roles.subjects[0]?.kind === type);

export const castProjectSharingRoleType = (role: string): ProjectSharingRoleType =>
  role === ProjectSharingRoleType.ADMIN
    ? ProjectSharingRoleType.ADMIN
    : ProjectSharingRoleType.EDIT;

export const firstSubject = (roleBinding: RoleBindingKind): string =>
  roleBinding.subjects[0]?.name || '';

export const roleLabel = (value: ProjectSharingRoleType): string =>
  value === ProjectSharingRoleType.ADMIN ? 'Admin' : 'Edit';
