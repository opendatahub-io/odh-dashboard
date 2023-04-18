import { RoleBindingKind } from '~/k8sTypes';
import { DashboardConfig } from '~/types';
import { featureFlagEnabled } from '~/utilities/utils';
import { getDisplayNameFromK8sResource } from '~/pages/projects/utils';
import { ProjectSharingRBType, ProjectSharingRoleType, RoleBindingSubjectWithRole } from './types';

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

export const convertRoleBindingsToSubjectsWithRoles = (
  roleBindings: RoleBindingKind[],
): RoleBindingSubjectWithRole[] =>
  roleBindings.flatMap((roleBinding) =>
    roleBinding.subjects.map((subject) => ({
      ...subject,
      role: castProjectSharingRoleType(roleBinding.roleRef.name) || ProjectSharingRoleType.EDIT,
      roleBindingName: roleBinding.metadata.name,
      roleBindingNamespace: roleBinding.metadata.namespace,
    })),
  );

export const castProjectSharingRoleType = (role: string): ProjectSharingRoleType | undefined =>
  ProjectSharingRoleType[role.toUpperCase() as keyof typeof ProjectSharingRoleType];
