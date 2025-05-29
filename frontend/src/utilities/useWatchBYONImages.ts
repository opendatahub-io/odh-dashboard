import * as React from 'react';
import { fetchBYONImages } from '#~/services/imagesService';
import { BYONImage } from '#~/types';
import useFetchState, { FetchState } from './useFetchState';
import { POLL_INTERVAL } from './const';

export const useWatchBYONImages = (): FetchState<BYONImage[]> => {
  const getBYONImages = React.useCallback(() => fetchBYONImages(), []);

  return useFetchState<BYONImage[]>(getBYONImages, [], { refreshRate: POLL_INTERVAL });
};
