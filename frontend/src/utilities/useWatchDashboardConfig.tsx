import * as React from 'react';
import { DashboardConfig } from '../types';
import { POLL_INTERVAL } from './const';
import { useDeepCompareMemoize } from './useDeepCompareMemoize';
import { fetchDashboardConfig } from '../services/dashboardConfigService';

export const blankDashboardCR: DashboardConfig = {
  apiVersion: 'opendatahub.io/v1alpha',
  kind: 'OdhDashboardConfig',
  metadata: {
    name: 'odh-dashboard-config',
  },
  spec: {
    dashboardConfig: {
      enablement: true,
      disableInfo: false,
      disableSupport: false,
      disableClusterManager: false,
      disableTracking: false,
      disableBYONImageStream: false,
      disableISVBadges: false,
      disableAppLauncher: false,
      disableUserManagement: false,
    },
    groupsConfig: {
      adminGroups: 'odh-admins',
      allowedGroups: 'system:authenticated',
    },
  },
};

export const useWatchDashboardConfig = (): {
  dashboardConfig: DashboardConfig;
  loaded: boolean;
  loadError: Error | undefined;
} => {
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [dashboardConfig, setDashboardConfig] = React.useState<DashboardConfig>(blankDashboardCR);

  React.useEffect(() => {
    let watchHandle;
    let cancelled = false;
    const watchDashboardConfig = () => {
      fetchDashboardConfig()
        .then((config) => {
          if (cancelled) {
            return;
          }
          setLoaded(true);
          setLoadError(undefined);
          setDashboardConfig(config);
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

  const retConfig = useDeepCompareMemoize<DashboardConfig>(dashboardConfig);

  return { dashboardConfig: retConfig || blankDashboardCR, loaded, loadError };
};
