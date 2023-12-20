import * as React from 'react';
import { fetchSegmentKey } from '~/services/segmentKeyService';
import { ODHSegmentKey } from '~/types';
import { POLL_INTERVAL } from './const';

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
