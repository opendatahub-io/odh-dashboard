import React from 'react';
import { useAppContext } from '#~/app/AppContext';
import { useAppSelector } from '#~/redux/hooks';
import { fireIdentifyEvent, firePageEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { useTrackUser } from '#~/concepts/analyticsTracking/useTrackUser';
import { useWatchSegmentKey } from './useWatchSegmentKey';
import { initSegment } from './initSegment';

export const useSegmentTracking = (): void => {
  const { segmentKey, loaded, loadError } = useWatchSegmentKey();
  const { dashboardConfig } = useAppContext();
  const username = useAppSelector((state) => state.user);
  const clusterID = useAppSelector((state) => state.clusterID);
  const [userProps, uPropsLoaded] = useTrackUser(username);
  const disableTrackingConfig = dashboardConfig.spec.dashboardConfig.disableTracking;

  React.useEffect(() => {
    if (segmentKey && loaded && !loadError && username && clusterID && uPropsLoaded) {
      window.clusterID = clusterID;
      initSegment({
        segmentKey,
        enabled: !disableTrackingConfig,
      }).then(() => {
        fireIdentifyEvent(userProps);
        firePageEvent();
      });
    }
  }, [
    clusterID,
    loadError,
    loaded,
    segmentKey,
    username,
    disableTrackingConfig,
    userProps,
    uPropsLoaded,
  ]);
};
