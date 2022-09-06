import * as React from 'react';
import { DashboardConfig } from '../types';
import { POLL_INTERVAL } from '../utilities/const';
import { useDeepCompareMemoize } from '../utilities/useDeepCompareMemoize';
import { fetchDashboardConfig } from '../services/dashboardConfigService';

export const useApplicationSettings = (): {
  dashboardConfig: DashboardConfig | null;
  loaded: boolean;
  loadError: Error | undefined;
} => {
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [dashboardConfig, setDashboardConfig] = React.useState<DashboardConfig | null>(null);

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
  }, []);

  const retConfig = useDeepCompareMemoize<DashboardConfig | null>(dashboardConfig);

  return { dashboardConfig: retConfig, loaded, loadError };
};
