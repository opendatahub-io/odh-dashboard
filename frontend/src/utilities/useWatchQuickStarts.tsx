import * as React from 'react';
import { QuickStart } from '@cloudmosaic/quickstarts';
import { fetchQuickStarts } from '../services/quickStartsService';
import { POLL_INTERVAL } from './const';
import { useDeepCompareMemoize } from './useDeepCompareMemoize';

export const useWatchQuickStarts = (): {
  quickStarts: QuickStart[];
  loaded: boolean;
  loadError: Error | undefined;
} => {
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [quickStarts, setQuickStarts] = React.useState<QuickStart[]>([]);

  React.useEffect(() => {
    let watchHandle;
    const watchQuickStarts = () => {
      fetchQuickStarts()
        .then((updatedQuickStarts: QuickStart[]) => {
          setLoaded(true);
          setLoadError(undefined);
          setQuickStarts(updatedQuickStarts);
        })
        .catch((e) => {
          setLoadError(e);
        });
      watchHandle = setTimeout(watchQuickStarts, POLL_INTERVAL);
    };
    watchQuickStarts();

    return () => {
      if (watchHandle) {
        clearTimeout(watchHandle);
      }
    };
    // Don't update when components are updated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retQuickStarts = useDeepCompareMemoize<QuickStart[]>(quickStarts);

  return { quickStarts: retQuickStarts || [], loaded, loadError };
};
