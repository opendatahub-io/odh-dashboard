import { useBrowserStorage } from '~/components/browserStorage';
import { SetBrowserStorageHook } from '~/components/browserStorage/BrowserStorageContext';
import { TimeframeTitle } from '~/concepts/metrics/types';

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
