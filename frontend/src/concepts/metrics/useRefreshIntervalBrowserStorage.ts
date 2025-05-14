import {
  SetBrowserStorageHook,
  useBrowserStorage,
} from '~/components/browserStorage/BrowserStorageContext';
import { RefreshIntervalTitle } from '~/concepts/metrics/types';

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
