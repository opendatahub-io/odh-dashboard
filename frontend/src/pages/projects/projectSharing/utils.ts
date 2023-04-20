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

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
  return new Intl.DateTimeFormat('en-US', options).format(date);
};

export const filterRoleBindingSubjects = (
  roleBindings: RoleBindingKind[],
  type: ProjectSharingRBType,
): RoleBindingKind[] => roleBindings.filter((roles) => roles.subjects[0]?.kind === type);

export const castProjectSharingRoleType = (role: string): ProjectSharingRoleType | undefined =>
  ProjectSharingRoleType[role.toUpperCase() as keyof typeof ProjectSharingRoleType];

export const compareDatesWithUndefined = (
  date1: string | undefined,
  date2: string | undefined,
): number => {
  if (date1 === undefined && date2 === undefined) {
    return 0;
  }
  if (date1 === undefined) {
    return -1;
  }
  if (date2 === undefined) {
    return 1;
  }
  const date1Date = new Date(date1);
  const date2Date = new Date(date2);
  if (date1Date.toString() === 'Invalid Date') {
    return -1;
  }
  if (date2Date.toString() === 'Invalid Date') {
    return 1;
  }
  return date1Date.getTime() - date2Date.getTime();
};

export const ensureRoleBindingCreationSorting = (roleBinding1: RoleBindingKind, roleBinding2: RoleBindingKind, sortDirection: string | undefined, sorting: number): number => {
  if (roleBinding1.subjects[0]?.name === '') {
    return sortDirection === 'asc' ? 1 : -1;
  } else if (roleBinding2.subjects[0]?.name === '') {
    return sortDirection === 'asc' ? -1 : 1;
  }
  return sorting
}