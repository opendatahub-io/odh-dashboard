import * as React from 'react';
import { useTrackEvent, useTrackPageEvent } from '@odh-dashboard/analytics/react';
import type {
  UserInteractionProviderProps,
  UserInteractionAPI,
} from '@mf/modelRegistry/extension-points';

const SegmentUserInteractionProvider: React.FC<UserInteractionProviderProps> = ({ children }) => {
  const trackEvent = useTrackEvent();
  const trackPageEvent = useTrackPageEvent();
  const api = React.useMemo<UserInteractionAPI>(
    () => ({
      // Form/link helpers forwarded unchanged to the same custom-event callback.
      trackFormEvent: trackEvent,
      trackLinkEvent: trackEvent,
      trackSimpleEvent: (
        eventName: string,
        properties?: Record<string, string | number | boolean | undefined>,
      ) => trackEvent(eventName, properties ?? {}),
      trackPageEvent,
    }),
    [trackEvent, trackPageEvent],
  );

  return <>{children(api)}</>;
};

export default SegmentUserInteractionProvider;
