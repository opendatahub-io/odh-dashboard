import * as React from 'react';
import { AxiosError } from 'axios';
import { DashboardConfigKind } from '#~/k8sTypes';
import { POLL_INTERVAL } from '#~/utilities/const';
import { useDeepCompareMemoize } from '#~/utilities/useDeepCompareMemoize';
import { fetchDashboardConfig } from '#~/services/dashboardConfigService';
import useTimeBasedRefresh from './useTimeBasedRefresh';

export const useApplicationSettings = (): {
  dashboardConfig: DashboardConfigKind | null;
  loaded: boolean;
  loadError: AxiosError | undefined;
  refresh: () => Promise<void>;
} => {
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<AxiosError>();
  const [dashboardConfig, setDashboardConfig] = React.useState<DashboardConfigKind | null>(null);
  const setRefreshMarker = useTimeBasedRefresh();

  const refresh = React.useCallback(
    () =>
      fetchDashboardConfig(true)
        .then((config) => {
          setDashboardConfig(config);
          setLoaded(true);
          setLoadError(undefined);
        })
        .catch((e) => {
          if (e?.response?.data?.message?.includes('Error getting Oauth Info for user')) {
            // NOTE: this endpoint only requests oauth because of the security layer, this is not an ironclad use-case
            // Something went wrong on the server with the Oauth, let us just log them out and refresh for them
            /* eslint-disable-next-line no-console */
            console.error(
              'Something went wrong with the oauth token, please log out...',
              e.message,
              e,
            );
            return;
          }
          setLoadError(e);
        }),
    [],
  );

  React.useEffect(() => {
    let watchHandle: ReturnType<typeof setTimeout>;
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
          if (e?.response?.data?.message?.includes('Error getting Oauth Info for user')) {
            // NOTE: this endpoint only requests oauth because of the security layer, this is not an ironclad use-case
            // Something went wrong on the server with the Oauth, let us just log them out and refresh for them
            /* eslint-disable-next-line no-console */
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
      clearTimeout(watchHandle);
    };
  }, [setRefreshMarker]);

  const retConfig = useDeepCompareMemoize<DashboardConfigKind | null>(dashboardConfig);

  return { dashboardConfig: retConfig, loaded, loadError, refresh };
};
