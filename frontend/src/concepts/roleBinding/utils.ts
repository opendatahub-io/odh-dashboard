import { capitalize } from '@patternfly/react-core';
import { RoleBindingKind } from '~/k8sTypes';
import { RoleBindingPermissionsRBType, RoleBindingPermissionsRoleType } from './types';

export const filterRoleBindingSubjects = (
  roleBindings: RoleBindingKind[],
  type: RoleBindingPermissionsRBType,
): RoleBindingKind[] => roleBindings.filter((roles) => roles.subjects[0]?.kind === type);

export const castRoleBindingPermissionsRoleType = (
  role: string,
): RoleBindingPermissionsRoleType => {
  if (role === RoleBindingPermissionsRoleType.ADMIN) {
    return RoleBindingPermissionsRoleType.ADMIN;
  }
  if (role === RoleBindingPermissionsRoleType.EDIT) {
    return RoleBindingPermissionsRoleType.EDIT;
  }
  return RoleBindingPermissionsRoleType.DEFAULT;
};

export const firstSubject = (roleBinding: RoleBindingKind): string =>
  roleBinding.subjects[0]?.name || '';

export const roleLabel = (value: RoleBindingPermissionsRoleType): string => {
  if (value === RoleBindingPermissionsRoleType.EDIT) {
    return 'Contributor';
  }
  return capitalize(value);
};
