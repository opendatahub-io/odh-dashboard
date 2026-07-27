import React from 'react';
import type { GuidedTourEntryPoint } from './tracking/guidedTourTracking';

const WHATS_NEW_EVENT = 'whats-new-tour-open';

type WhatsNewTourEventDetail = {
  entryPoint: GuidedTourEntryPoint;
};

const isGuidedTourEntryPoint = (value: unknown): value is GuidedTourEntryPoint =>
  value === 'auto-launch' || value === 'masthead' || value === 'home-task-assistant';

const getEntryPointFromEvent = (event: Event): GuidedTourEntryPoint => {
  if (!(event instanceof CustomEvent)) {
    return 'masthead';
  }
  const { detail } = event;
  if (
    typeof detail === 'object' &&
    detail !== null &&
    'entryPoint' in detail &&
    isGuidedTourEntryPoint(detail.entryPoint)
  ) {
    return detail.entryPoint;
  }
  return 'masthead';
};

export const openWhatsNewTour = (entryPoint: GuidedTourEntryPoint = 'masthead'): void => {
  document.dispatchEvent(
    new CustomEvent<WhatsNewTourEventDetail>(WHATS_NEW_EVENT, { detail: { entryPoint } }),
  );
};

export const useWhatsNewTourListener = (
  onOpen: (entryPoint: GuidedTourEntryPoint) => void,
): void => {
  const callbackRef = React.useRef(onOpen);
  callbackRef.current = onOpen;

  React.useEffect(() => {
    const handler = (event: Event) => {
      callbackRef.current(getEntryPointFromEvent(event));
    };
    document.addEventListener(WHATS_NEW_EVENT, handler);
    return () => document.removeEventListener(WHATS_NEW_EVENT, handler);
  }, []);
};
