import React from 'react';
import { useSegmentSetup } from '@odh-dashboard/analytics';
import { useAppContext } from '#~/app/AppContext';
import { useAppSelector } from '#~/redux/hooks';
import { fireIdentifyEvent, firePageEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { useTrackUser } from '#~/concepts/analyticsTracking/useTrackUser';
import { useWatchSegmentKey } from './useWatchSegmentKey';

const SEGMENT_CDN_URL = 'https://console.redhat.com/connections/cdn';
const SEGMENT_API_HOST = 'console.redhat.com/connections/api/v1';

export const useSegmentTracking = (): void => {
  const { segmentKey, loaded, loadError } = useWatchSegmentKey();
  const { dashboardConfig } = useAppContext();
  const username = useAppSelector((state) => state.user);
  const clusterID = useAppSelector((state) => state.clusterID);
  const [userProps, uPropsLoaded] = useTrackUser(username);
  const disableTrackingConfig = dashboardConfig.spec.dashboardConfig.disableTracking;
  const identify = React.useCallback(() => fireIdentifyEvent(userProps), [userProps]);
  const isReady = loaded && !loadError && !!username && !!clusterID && uPropsLoaded;

  useSegmentSetup({
    segmentKey,
    cdnURL: SEGMENT_CDN_URL,
    apiHost: SEGMENT_API_HOST,
    ready: isReady,
    enabled: !disableTrackingConfig,
    clusterID: clusterID ?? '',
    userKey: username,
    identify,
    trackPageEvent: firePageEvent,
  });
};
