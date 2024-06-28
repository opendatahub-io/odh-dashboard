import React, { useRef } from 'react';
import { useAppContext } from '~/app/AppContext';
import { useAppDispatch, useAppSelector } from '~/redux/hooks';
import { IdentifyEventProperties } from '~/concepts/analyticsTracking/trackingProperties';
import { segmentReady } from '~/redux/actions/actions';
import { useWatchSegmentKey } from './useWatchSegmentKey';
import { fireIdentifyEvent, initSegment } from '~/concepts/analyticsTracking/segmentIOUtils';

export const useSegmentTracking = (): void => {
  const { segmentKey, loaded, loadError } = useWatchSegmentKey();
  const { dashboardConfig } = useAppContext();
  const username = useAppSelector((state) => state.user);
  const clusterID = useAppSelector((state) => state.clusterID);
  const segmentInitialised = useAppSelector((state) => state.segmentInitialised);
  const dispatch = useAppDispatch();
  const initDone = useRef(false);

  React.useEffect(() => {
    if (segmentKey && loaded && !loadError && username && clusterID) {
      window.clusterID = clusterID;
      initSegment({
        segmentKey,
        username,
        enabled: !dashboardConfig.spec.dashboardConfig.disableTracking,
      });

      dispatch(segmentReady());
    }
  }, [clusterID, loadError, loaded, segmentKey, username, dashboardConfig, dispatch]);

  // TODO temporary. We want to swap this this function depending on context
  // TODO also this makes the fireIdentify below trigger endlessly via useEffect-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  async function encodeUsername() {
    const anonymousIDBuffer = await crypto.subtle.digest(
      'SHA-1',
      new TextEncoder().encode(username),
    );
    const anonymousIDArray = Array.from(new Uint8Array(anonymousIDBuffer));
    return anonymousIDArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Init user
  React.useEffect(() => {
    if (initDone.current) {
      return;
    }
    if (segmentKey && loaded && !loadError && username && clusterID && segmentInitialised) {
      encodeUsername().then((anonymousID) =>
        fireIdentifyEvent({ anonymousID } as IdentifyEventProperties),
      );
      initDone.current = true;
    }
  }, [clusterID, segmentKey, username, segmentInitialised, loaded, loadError, encodeUsername]);
};
