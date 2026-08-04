import { useBrowserStorage } from '@odh-dashboard/ui-core/utilities';
import type { SetBrowserStorageHook } from '@odh-dashboard/ui-core/utilities';
import { TimeframeTitle } from '@odh-dashboard/ui-core/types/metrics';

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
