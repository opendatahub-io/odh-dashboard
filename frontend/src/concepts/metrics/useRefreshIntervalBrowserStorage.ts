import { useBrowserStorage } from '@odh-dashboard/ui-core/utilities';
import type { SetBrowserStorageHook } from '@odh-dashboard/ui-core/utilities';
import { RefreshIntervalTitle } from '#~/concepts/metrics/types';

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
