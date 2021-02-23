import * as React from 'react';
import * as _ from 'lodash';
import { fetchQuickStarts } from '../services/quickStartsService';
import { QuickStart } from '@cloudmosaic/quickstarts';
import { POLL_INTERVAL } from './const';

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
          if (!_.isEqual(quickStarts, updatedQuickStarts)) {
            setQuickStarts(updatedQuickStarts);
            setLoaded(true);
          }
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

  return { quickStarts, loaded, loadError };
};
