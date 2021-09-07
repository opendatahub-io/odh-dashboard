import { DashboardConfig } from '../types';
import { fetchDashboardConfig } from '../services/dashboardConfigService';
import { useFetchWatcher } from './useFetchWatcher';

export const useWatchDashboardConfig = (): {
  results: DashboardConfig | null;
  loaded: boolean;
  loadError?: Error;
} => {
  return useFetchWatcher<DashboardConfig>(fetchDashboardConfig);
};
