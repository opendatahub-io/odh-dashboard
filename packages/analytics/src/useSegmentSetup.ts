import * as React from 'react';
import { initSegment, type SegmentConnectionOptions } from './initSegment';
import type { TrackPageEvent } from './types';

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
  const setupGenerationRef = React.useRef(0);

  React.useLayoutEffect(() => {
    identifyRef.current = identify;
    trackPageEventRef.current = trackPageEvent;
    enabledRef.current = enabled;
  }, [identify, trackPageEvent, enabled]);

  React.useLayoutEffect(
    () => () => {
      // Invalidate at commit, before new callbacks can reach the previous client.
      setupGenerationRef.current += 1;
    },
    [segmentKey, ready, enabled, clusterID, userKey, cdnURL, apiHost, protocol],
  );

  React.useEffect(() => {
    if (!segmentKey || !ready) {
      return;
    }
    const setupGeneration = setupGenerationRef.current;
    window.clusterID = clusterID;
    initSegment({ segmentKey, enabled, cdnURL, apiHost, protocol }).then(() => {
      if (setupGeneration !== setupGenerationRef.current || !enabled || !enabledRef.current) {
        return;
      }
      identifyRef.current();
      trackPageEventRef.current();
    });
  }, [segmentKey, ready, enabled, clusterID, userKey, cdnURL, apiHost, protocol]);
};
