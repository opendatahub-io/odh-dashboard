import React from 'react';
import { useLocation } from 'react-router-dom';
import { firePageEvent } from './segmentIOUtils';

export const useTrackHistory = (): void => {
  const { pathname } = useLocation();

  // notify url change events
  React.useEffect(() => {
    firePageEvent();
  }, [pathname]);
};
