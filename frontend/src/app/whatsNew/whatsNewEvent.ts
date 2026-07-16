import React from 'react';

const WHATS_NEW_EVENT = 'whats-new-tour-open';

export const openWhatsNewTour = (): void => {
  document.dispatchEvent(new CustomEvent(WHATS_NEW_EVENT));
};

export const useWhatsNewTourListener = (onOpen: () => void): void => {
  const callbackRef = React.useRef(onOpen);
  callbackRef.current = onOpen;

  React.useEffect(() => {
    const handler = () => callbackRef.current();
    document.addEventListener(WHATS_NEW_EVENT, handler);
    return () => document.removeEventListener(WHATS_NEW_EVENT, handler);
  }, []);
};
