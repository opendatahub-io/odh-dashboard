import * as React from 'react';
import { POLL_INTERVAL } from '#~/utilities/const';
import { ODHSegmentKey } from '#~/concepts/analyticsTracking/trackingProperties';
import { fetchSegmentKey } from './segmentKeyService';

export const useWatchSegmentKey = (): {
  segmentKey: string;
  loaded: boolean;
  loadError: Error | undefined;
} => {
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [segmentKey, setSegmentKey] = React.useState('');

  React.useEffect(() => {
    let watchHandle: ReturnType<typeof setTimeout>;
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
      clearTimeout(watchHandle);
    };
  }, []);

  return { segmentKey: segmentKey || '', loaded, loadError };
};
