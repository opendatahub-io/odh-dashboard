import * as React from 'react';
import { DashboardConfig } from '../types';
import { POLL_INTERVAL } from '../utilities/const';
import { useDeepCompareMemoize } from '../utilities/useDeepCompareMemoize';
import { fetchDashboardConfig } from '../services/dashboardConfigService';
import useTimeBasedRefresh from './useTimeBasedRefresh';

export const useApplicationSettings = (): {
  dashboardConfig: DashboardConfig | null;
  loaded: boolean;
  loadError: Error | undefined;
} => {
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [dashboardConfig, setDashboardConfig] = React.useState<DashboardConfig | null>(null);
  const setRefreshMarker = useTimeBasedRefresh();

  React.useEffect(() => {
    let watchHandle;
    let cancelled = false;
    const watchDashboardConfig = () => {
      fetchDashboardConfig()
        .then((config) => {
          if (cancelled) {
            return;
          }
          setDashboardConfig(config);
          setLoaded(true);
          setLoadError(undefined);
        })
        .catch((e) => {
          if (e?.message?.includes('Error getting Oauth Info for user')) {
            // NOTE: this endpoint only requests oauth because of the security layer, this is not an ironclad use-case
            // Something went wrong on the server with the Oauth, let us just log them out and refresh for them
            console.error(
              'Something went wrong with the oauth token, please log out...',
              e.message,
              e,
            );
            setRefreshMarker(new Date());
            return;
          }
          setLoadError(e);
        });
      watchHandle = setTimeout(watchDashboardConfig, POLL_INTERVAL);
    };
    watchDashboardConfig();

    return () => {
      cancelled = true;
      if (watchHandle) {
        clearTimeout(watchHandle);
      }
    };
  }, [setRefreshMarker]);

  const retConfig = useDeepCompareMemoize<DashboardConfig | null>(dashboardConfig);

  return { dashboardConfig: retConfig, loaded, loadError };
};
