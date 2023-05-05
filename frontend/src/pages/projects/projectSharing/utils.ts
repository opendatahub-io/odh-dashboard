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

export const castProjectSharingRoleType = (role: string): ProjectSharingRoleType =>
  role === ProjectSharingRoleType.ADMIN
    ? ProjectSharingRoleType.ADMIN
    : ProjectSharingRoleType.EDIT;

export const firstSubject = (roleBinding: RoleBindingKind): string =>
  roleBinding.subjects[0]?.name || '';

export const roleLabel = (value: ProjectSharingRoleType): string =>
  value === ProjectSharingRoleType.ADMIN ? 'Admin' : 'Edit';
