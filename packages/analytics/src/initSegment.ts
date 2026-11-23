import { AnalyticsBrowser } from '@segment/analytics-next';

export type SegmentConnectionOptions = {
  /** Full base URL of the Segment CDN serving source settings and integrations. */
  cdnURL: string;
  /** Segment ingestion host and path, without the URL scheme. */
  apiHost: string;
  /** Protocol for ingestion requests; defaults to HTTPS. */
  protocol?: 'http' | 'https';
};

export type InitSegmentOptions = SegmentConnectionOptions & {
  /** Segment write key; an empty value skips initialization. */
  segmentKey: string;
  /** Whether to initialize the SDK; false leaves any existing client unchanged. */
  enabled: boolean;
};

export const initSegment = async (props: InitSegmentOptions): Promise<void> => {
  const { segmentKey, enabled, cdnURL, apiHost, protocol = 'https' } = props;
  if (!enabled || !segmentKey) {
    return;
  }
  window.analytics = AnalyticsBrowser.load(
    {
      writeKey: segmentKey,
      cdnURL,
    },

    {
      integrations: {
        'Segment.io': {
          apiHost,
          protocol,
        },
      },
    },
  );
};
