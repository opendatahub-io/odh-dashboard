import { RoleBindingKind } from '~/k8sTypes';
import { DashboardConfig } from '~/types';
import { featureFlagEnabled } from '~/utilities/utils';
import { getDisplayNameFromK8sResource } from '~/pages/projects/utils';

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
