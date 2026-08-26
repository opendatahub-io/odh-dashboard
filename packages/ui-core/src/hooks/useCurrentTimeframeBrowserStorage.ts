import { useBrowserStorage } from './useBrowserStorage';
import type { SetBrowserStorageHook } from './useBrowserStorage';
import { TimeframeTitle } from '../types/metrics';

const useCurrentTimeframeBrowserStorage = (): [
  TimeframeTitle,
  SetBrowserStorageHook<TimeframeTitle>,
] =>
  useBrowserStorage<TimeframeTitle>(
    'odh.dashboard.metrics.current.timeframe',
    TimeframeTitle.ONE_DAY,
    false,
    true,
  );

export default useCurrentTimeframeBrowserStorage;
