import { DashboardConfig } from '~/types';
import { featureFlagEnabled } from '~/utilities/utils';

export const isProjectSharingEnabled = (dashboardConfig: DashboardConfig) =>
  featureFlagEnabled(dashboardConfig.spec.dashboardConfig.disableProjectSharing);
