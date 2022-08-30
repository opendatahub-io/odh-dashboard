import React from 'react';
import { useAppContext } from '../app/AppContext';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/types';
import { initSegment } from '../utilities/segmentIOUtils';
import { useWatchSegmentKey } from './useWatchSegmentKey';

export const useSegmentTracking = (): void => {
  const { segmentKey, loaded, loadError } = useWatchSegmentKey();
  const { dashboardConfig } = useAppContext();
  const username = useSelector((state: RootState) => state.appState.user);
  const clusterID = useSelector((state: RootState) => state.appState.clusterID);

  React.useEffect(() => {
    if (segmentKey && loaded && !loadError && username && clusterID) {
      window.clusterID = clusterID;
      initSegment({
        segmentKey,
        username,
        enabled: !dashboardConfig.spec.dashboardConfig.disableTracking,
      });
    }
  }, [clusterID, loadError, loaded, segmentKey, username, dashboardConfig]);
};
