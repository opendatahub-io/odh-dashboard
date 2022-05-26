import * as React from 'react';
import { fetchSegmentKey } from 'services/segmentKeyService';
import { ODHSegmentKey } from '../types';
import { POLL_INTERVAL } from './const';

export const useWatchSegmentKey = (): {
  segmentKey: string;
  loaded: boolean;
  loadError: Error | undefined;
} => {
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [segmentKey, setSegmentKey] = React.useState<string>('');

  React.useEffect(() => {
    let watchHandle;
    const watchSegmentKey = () => {
      fetchSegmentKey()
        .then((updatedSegmentKey: ODHSegmentKey) => {
          setLoaded(true);
          setLoadError(undefined);
          setSegmentKey(updatedSegmentKey.segmentKey);
        })
        .catch((e) => {
          setLoadError(e);
        });
      watchHandle = setTimeout(watchSegmentKey, POLL_INTERVAL);
    };
    watchSegmentKey();

    return () => {
      if (watchHandle) {
        clearTimeout(watchHandle);
      }
    };
    // Don't update when segment-key is updated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { segmentKey: segmentKey || '', loaded, loadError };
};
