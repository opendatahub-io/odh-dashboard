import * as React from 'react';
import type { ODHSegmentKey } from '@odh-dashboard/analytics';
import { POLL_INTERVAL } from '#~/utilities/const';
import { fetchSegmentKey } from './segmentKeyService';

export const useWatchSegmentKey = (): {
  segmentKey: string;
  amplitudeApiKey: string;
  loaded: boolean;
  loadError: Error | undefined;
} => {
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [segmentKey, setSegmentKey] = React.useState('');
  const [amplitudeApiKey, setAmplitudeApiKey] = React.useState('');

  React.useEffect(() => {
    let watchHandle: ReturnType<typeof setTimeout>;
    const watchSegmentKey = () => {
      fetchSegmentKey()
        .then((updatedSegmentKey: ODHSegmentKey) => {
          setLoaded(true);
          setLoadError(undefined);
          setSegmentKey(updatedSegmentKey.segmentKey);
          setAmplitudeApiKey(updatedSegmentKey.amplitudeApiKey);
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

  return {
    segmentKey: segmentKey || '',
    amplitudeApiKey: amplitudeApiKey || '',
    loaded,
    loadError,
  };
};
