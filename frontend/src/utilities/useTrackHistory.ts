import React from 'react';
import { useHistory } from 'react-router';
import { fireTrackingEvent } from './segmentIOUtils';

export const useTrackHistory = (): void => {
  const history = useHistory();

  // notify url change events
  React.useEffect(() => {
    let { pathname } = history.location;
    const unlisten = history.listen(() => {
      const { pathname: nextPathname } = history.location;
      if (pathname !== nextPathname) {
        pathname = nextPathname;
        fireTrackingEvent('page');
      }
    });
    return () => unlisten();
  }, [history]);
};
