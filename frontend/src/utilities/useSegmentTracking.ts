import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/types';
import { initSegment } from '../utilities/segmentIOUtils';
import { useWatchSegmentKey } from './useWatchSegmentKey';

export const useSegmentTracking = (): void => {
  const { segmentKey, loaded, loadError } = useWatchSegmentKey();
  const username = useSelector((state: RootState) => state.appReducer.user);
  const clusterID = useSelector((state: RootState) => state.appReducer.clusterID);

  React.useEffect(() => {
    if (segmentKey && loaded && !loadError && username && clusterID) {
      window.clusterID = clusterID;
      initSegment({ segmentKey, username });
    }
  }, [clusterID, loadError, loaded, segmentKey, username]);
};
