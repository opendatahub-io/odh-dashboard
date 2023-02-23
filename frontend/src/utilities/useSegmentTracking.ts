import React from 'react';
import { useAppContext } from '~/app/AppContext';
import { initSegment } from '~/utilities/segmentIOUtils';
import { useAppSelector } from '~/redux/hooks';
import { useWatchSegmentKey } from './useWatchSegmentKey';

export const useSegmentTracking = (): void => {
  const { segmentKey, loaded, loadError } = useWatchSegmentKey();
  const { dashboardConfig } = useAppContext();
  const username = useAppSelector((state) => state.user);
  const clusterID = useAppSelector((state) => state.clusterID);

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
