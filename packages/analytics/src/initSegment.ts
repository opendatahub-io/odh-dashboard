import { AnalyticsBrowser } from '@segment/analytics-next';

export const initSegment = async (props: {
  segmentKey: string;
  enabled: boolean;
}): Promise<void> => {
  const { segmentKey, enabled } = props;
  if (!enabled || !segmentKey) {
    return;
  }
  window.analytics = AnalyticsBrowser.load(
    {
      writeKey: segmentKey,
      cdnURL: 'https://console.redhat.com/connections/cdn',
    },

    {
      integrations: {
        'Segment.io': {
          apiHost: 'console.redhat.com/connections/api/v1',
          protocol: 'https',
        },
      },
    },
  );
};
