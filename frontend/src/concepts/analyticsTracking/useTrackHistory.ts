import { usePageTracking } from '@odh-dashboard/analytics';
import { useLocation } from 'react-router-dom';
import { firePageEvent } from './segmentIOUtils';

export const useTrackHistory = (): void => {
  const { pathname } = useLocation();

  // notify url change events
  usePageTracking(pathname, firePageEvent);
};
