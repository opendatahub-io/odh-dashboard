import { useBrowserStorage } from './useBrowserStorage';
import type { SetBrowserStorageHook } from './useBrowserStorage';
import { RefreshIntervalTitle } from '../types/metrics';

const useRefreshIntervalBrowserStorage = (
  initialRefreshInterval = RefreshIntervalTitle.FIVE_MINUTES,
): [RefreshIntervalTitle, SetBrowserStorageHook<RefreshIntervalTitle>] =>
  useBrowserStorage<RefreshIntervalTitle>(
    'odh.dashboard.metrics.refresh_interval',
    initialRefreshInterval,
    false,
    true,
  );

export default useRefreshIntervalBrowserStorage;
