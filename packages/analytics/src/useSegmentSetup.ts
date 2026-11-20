import * as React from 'react';
import { initSegment, type SegmentConnectionOptions } from './initSegment';
import type { TrackPageEvent } from './types';

export type SegmentSetupOptions = SegmentConnectionOptions & {
  /** Segment write key; an empty value skips setup. */
  segmentKey: string;
  /** Whether the host configuration and user information needed for setup are available. */
  ready: boolean;
  /** Controls SDK initialization; does not stop an existing client or gate delivery callbacks. */
  enabled: boolean;
  /** Cluster identifier exposed as window.clusterID for tracking metadata. */
  clusterID: string;
  /** Host identity key whose changes rerun setup, even when callbacks are unchanged. */
  userKey?: string;
  /** Stable callback that sends host-mapped identity when initSegment resolves. */
  identify: () => void;
  /** Stable callback that sends the setup page event when initSegment resolves. */
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
  React.useEffect(() => {
    if (!segmentKey || !ready) {
      return;
    }
    window.clusterID = clusterID;
    initSegment({ segmentKey, enabled, cdnURL, apiHost, protocol }).then(() => {
      identify();
      trackPageEvent();
    });
  }, [
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
  ]);
};
