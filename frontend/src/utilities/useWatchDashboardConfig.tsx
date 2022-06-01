import { DashboardConfig } from '../types';
import { fetchDashboardConfig } from '../services/dashboardConfigService';
import { useFetchWatcher } from './useFetchWatcher';

const DEFAULT_CONFIG: DashboardConfig = {
  enablement: true,
  disableInfo: false,
  disableSupport: false,
  disableClusterManager: true,
  disableTracking: true,
  disableISVBadges: true,
  disableBYONImageStream: true,
  disableAppLauncher: true,
};

export const useWatchDashboardConfig = (): {
  results: DashboardConfig | null;
  loaded: boolean;
  loadError?: Error;
} => {
  return useFetchWatcher<DashboardConfig>(fetchDashboardConfig);
};
