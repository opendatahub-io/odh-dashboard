import * as React from 'react';
import { BYONImage } from '~/types';
import { listImageStreams } from '~/api';
import { mapImageStreamToBYONImage } from '~/utilities/imageStreamUtils';
import useFetchState, { FetchState } from '~/utilities/useFetchState';
import { POLL_INTERVAL } from '~/utilities/const';

export const useWatchBYONImages = (namespace: string): FetchState<BYONImage[]> => {
  const getBYONImages = React.useCallback(async () => {
    const imageStreams = await listImageStreams(namespace, 'byon');
    return imageStreams.map(mapImageStreamToBYONImage);
  }, [namespace]);

  return useFetchState<BYONImage[]>(getBYONImages, [], { refreshRate: POLL_INTERVAL });
};
