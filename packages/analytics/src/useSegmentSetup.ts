import * as React from 'react';
import { initSegment, type SegmentConnectionOptions } from './initSegment';
import type { TrackPageEvent } from './types';

type SetupConnection = {
  connected: boolean;
  resume?: () => void;
};

export type SegmentSetupOptions = SegmentConnectionOptions & {
  /** Segment write key; an empty value skips setup. */
  segmentKey: string;
  /** Whether the host configuration and user information needed for setup are available. */
  ready: boolean;
  /** Controls SDK initialization and gates setup identify/page callbacks; does not stop an existing client. */
  enabled: boolean;
  /** Cluster identifier exposed as window.clusterID for tracking metadata. */
  clusterID: string;
  /** Host identity key whose changes rerun setup, even when callbacks are unchanged. */
  userKey?: string;
  /** Latest committed callback that sends host-mapped identity when initSegment resolves. */
  identify: () => void;
  /** Latest committed callback that sends the setup page event when initSegment resolves. */
  trackPageEvent: TrackPageEvent;
};

/** Shared host setup; hosts own configuration retrieval, identity mapping, and delivery callbacks. */
export const useSegmentSetup = ({
  segmentKey,
  ready,
  enabled,
  clusterID,
  userKey,
  identify,
  trackPageEvent,
  cdnURL,
  apiHost,
  protocol,
}: SegmentSetupOptions): void => {
  const identifyRef = React.useRef(identify);
  const trackPageEventRef = React.useRef(trackPageEvent);
  const enabledRef = React.useRef(enabled);
  // Each set of setup inputs owns its connection, including temporary Suspense reconnections.
  const connection = React.useMemo<SetupConnection>(
    () => ({ connected: false }),
    [segmentKey, ready, enabled, clusterID, userKey, cdnURL, apiHost, protocol],
  );

  React.useLayoutEffect(() => {
    identifyRef.current = identify;
    trackPageEventRef.current = trackPageEvent;
    enabledRef.current = enabled;
  }, [identify, trackPageEvent, enabled]);

  React.useLayoutEffect(() => {
    connection.connected = true;
    // A reveal reconnects layout effects without restarting passive initialization.
    // Keep delivery asynchronous, as it is when initialization first resolves.
    void Promise.resolve().then(() => connection.resume?.());
    return () => {
      // Disconnect at commit, before new callbacks can reach the previous client.
      connection.connected = false;
    };
  }, [connection]);

  React.useEffect(() => {
    if (!segmentKey || !ready) {
      return;
    }
    // connected pauses delivery while hidden; cancelled permanently retires this attempt.
    // initialized waits for setup completion; delivered prevents repeats after reconnection.
    let cancelled = false;
    let initialized = false;
    let delivered = false;
    const completeSetup = () => {
      const isPendingDelivery = initialized && !delivered;
      const isActiveAttempt = !cancelled && connection.connected;
      const isTrackingEnabled = enabled && enabledRef.current;
      if (!isPendingDelivery || !isActiveAttempt || !isTrackingEnabled) {
        return;
      }
      delivered = true;
      identifyRef.current();
      trackPageEventRef.current();
    };
    connection.resume = completeSetup;
    window.clusterID = clusterID;
    initSegment({ segmentKey, enabled, cdnURL, apiHost, protocol }).then(() => {
      initialized = true;
      completeSetup();
    });
    return () => {
      cancelled = true;
      connection.resume = undefined;
    };
  }, [segmentKey, ready, enabled, clusterID, userKey, cdnURL, apiHost, protocol, connection]);
};
