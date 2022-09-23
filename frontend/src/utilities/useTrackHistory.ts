import React from 'react';
import { useLocation } from 'react-router-dom';
import { fireTrackingEvent } from './segmentIOUtils';

export const useTrackHistory = (): void => {
  const { pathname } = useLocation();

  // notify url change events
  React.useEffect(() => {
    fireTrackingEvent('page'); // TODO: do we want to track WHICH page?
  }, [pathname]);
};
