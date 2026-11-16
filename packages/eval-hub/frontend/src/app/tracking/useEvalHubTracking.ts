import * as React from 'react';
import { useTrackEvent } from '@odh-dashboard/analytics/react';
import { createEvalHubTracking, type EvalHubTracking } from './evalhubTracking';

type EvalHubTrackingHooks = {
  trackEvalHubEvent: EvalHubTracking['trackEvent'];
  trackEvalHubEventOnce: EvalHubTracking['trackEventOnce'];
  createEvalHubTrackingScope: EvalHubTracking['createScope'];
};

/** Bind Eval Hub's privacy and dedupe policy to the current host callback. */
export const useEvalHubTracking = (): EvalHubTrackingHooks => {
  const trackEvent = useTrackEvent();
  // A mounted scope must keep its dedupe state when the host replaces its callback.
  const delivery = React.useRef(trackEvent);
  React.useLayoutEffect(() => {
    delivery.current = trackEvent;
  }, [trackEvent]);
  return React.useMemo(() => {
    const tracking = createEvalHubTracking((...args) => delivery.current(...args));
    return {
      trackEvalHubEvent: tracking.trackEvent,
      trackEvalHubEventOnce: tracking.trackEventOnce,
      createEvalHubTrackingScope: tracking.createScope,
    };
  }, []);
};
