import { RoleBindingKind } from '~/k8sTypes';
import { DashboardConfig } from '~/types';
import { featureFlagEnabled } from '~/utilities/utils';
import { getDisplayNameFromK8sResource } from '~/pages/projects/utils';
import { ProjectSharingRBType, ProjectSharingRoleType } from './types';

export const isProjectSharingEnabled = (dashboardConfig: DashboardConfig) =>
  featureFlagEnabled(dashboardConfig.spec.dashboardConfig.disableProjectSharing);

export const getRoleBindingResourceName = (roleBinding: RoleBindingKind): string =>
  roleBinding.metadata?.name || '';
export const getRoleBindingDisplayName = (roleBinding: RoleBindingKind): string =>
  getDisplayNameFromK8sResource(roleBinding);

export const filterRoleBindingSubjects = (
  roleBindings: RoleBindingKind[],
  type: ProjectSharingRBType,
): RoleBindingKind[] => roleBindings.filter((roles) => roles.subjects[0]?.kind === type);

export const castProjectSharingRoleType = (role: string): ProjectSharingRoleType | undefined =>
  ProjectSharingRoleType[role.toUpperCase() as keyof typeof ProjectSharingRoleType];

export const ensureRoleBindingCreationSorting = (
  roleBinding1: RoleBindingKind,
  roleBinding2: RoleBindingKind,
  sortDirection: string | undefined,
  sorting: number,
): number => {
  if (firstSubject(roleBinding1) === '') {
    return sortDirection === 'asc' ? 1 : -1;
  } else if (firstSubject(roleBinding2) === '') {
    return sortDirection === 'asc' ? -1 : 1;
  }
  return sorting;
};

export const firstSubject = (roleBinding: RoleBindingKind): string =>
  roleBinding.subjects[0]?.name || '';
