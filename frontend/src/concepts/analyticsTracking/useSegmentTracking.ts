import React from 'react';
import {
  fireIdentifyEvent,
  firePageEvent,
  initSegment,
  initAmplitude,
} from '@odh-dashboard/analytics';
import { useAppContext } from '#~/app/AppContext';
import { useAppSelector } from '#~/redux/hooks';
import { useTrackUser } from '#~/concepts/analyticsTracking/useTrackUser';
import { useWatchSegmentKey } from './useWatchSegmentKey';

export const useSegmentTracking = (): void => {
  const { segmentKey, amplitudeApiKey, loaded, loadError } = useWatchSegmentKey();
  const { dashboardConfig } = useAppContext();
  const username = useAppSelector((state) => state.user);
  const clusterID = useAppSelector((state) => state.clusterID);
  const [userProps, uPropsLoaded] = useTrackUser(username);
  const disableTrackingConfig = dashboardConfig.spec.dashboardConfig.disableTracking;
  const trackingEnabled = !disableTrackingConfig;

  React.useEffect(() => {
    if (loaded && !loadError && username && clusterID && uPropsLoaded) {
      window.clusterID = clusterID;
      if (segmentKey) {
        initSegment({
          segmentKey,
          enabled: trackingEnabled,
        }).then(() => {
          fireIdentifyEvent(userProps);
          firePageEvent();
        });
      }
      initAmplitude({
        amplitudeApiKey,
        enabled: trackingEnabled,
        userId: userProps.userID,
      });
    }
  }, [
    amplitudeApiKey,
    clusterID,
    loadError,
    loaded,
    segmentKey,
    trackingEnabled,
    username,
    userProps,
    uPropsLoaded,
  ]);
};
