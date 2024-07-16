import React from 'react';
import { useAppContext } from '~/app/AppContext';
import { useAppSelector } from '~/redux/hooks';
import { fireTrackingEvent } from './segmentIOUtils';
import { useWatchSegmentKey } from './useWatchSegmentKey';
import { initSegment } from './initSegment';

export const useSegmentTracking = (): void => {
  const { segmentKey, loaded, loadError } = useWatchSegmentKey();
  const { dashboardConfig } = useAppContext();
  const username = useAppSelector((state) => state.user);
  const clusterID = useAppSelector((state) => state.clusterID);

  React.useEffect(() => {
    if (segmentKey && loaded && !loadError && username && clusterID) {
      const computeUserId = async () => {
        const anonymousIDBuffer = await crypto.subtle.digest(
          'SHA-1',
          new TextEncoder().encode(username),
        );
        const anonymousIDArray = Array.from(new Uint8Array(anonymousIDBuffer));
        return anonymousIDArray.map((b) => b.toString(16).padStart(2, '0')).join('');
      };

      window.clusterID = clusterID;
      initSegment({
        segmentKey,
        enabled: !dashboardConfig.spec.dashboardConfig.disableTracking,
      }).then(() => {
        computeUserId().then((userId) => {
          fireTrackingEvent('identify', { anonymousID: userId });
          fireTrackingEvent('page');
        });
      });
    }
  }, [clusterID, loadError, loaded, segmentKey, username, dashboardConfig]);
};
