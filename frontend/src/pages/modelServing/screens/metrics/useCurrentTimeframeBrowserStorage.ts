import { useBrowserStorage } from '~/components/browserStorage';
import { SetBrowserStorageHook } from '~/components/browserStorage/BrowserStorageContext';
import { TimeframeTitle } from '~/pages/modelServing/screens/types';

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
