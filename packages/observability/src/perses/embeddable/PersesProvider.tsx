import React, { useMemo } from 'react';
import { ThemeProvider } from '@mui/material';
import { ChartsProvider, SnackbarProvider } from '@perses-dev/components';
import { DashboardResource, DurationString } from '@perses-dev/core';
import {
  DashboardProvider,
  DatasourceStoreProvider,
  VariableProvider,
} from '@perses-dev/dashboards';
import {
  DataQueriesProvider,
  PluginRegistry,
  TimeRangeProviderWithQueryParams,
  TimeRangeProviderBasic,
  useInitialTimeRange,
  useInitialRefreshInterval,
} from '@perses-dev/plugin-system';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QueryParamProvider } from 'use-query-params';
import { ReactRouter6Adapter } from 'use-query-params/adapters/react-router-6';
import { pluginLoader } from '../persesPluginsLoader';
import { OdhDatasourceApi, CachedDatasourceAPI, PERSES_PROXY_BASE_PATH } from '../perses-client';
import { usePatternFlyTheme } from '../theme';

const DEFAULT_DURATION: DurationString = '30m';
const DEFAULT_REFRESH_INTERVAL: DurationString = '60s';

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 0,
      },
    },
  });

export type PersesProviderProps = {
  dashboardResource: DashboardResource;
  /** Initial time range duration (default: '30m') */
  defaultDuration?: DurationString;
  /** Initial refresh interval (default: '60s') */
  defaultRefreshInterval?: DurationString;
  /**
   * When true, syncs time range and variables to URL query params.
   * Use for full-page dashboard views. When false (default), state
   * is kept in memory only -- safe for multiple dashboards on one page.
   */
  syncToUrl?: boolean;
  children: React.ReactNode;
};

type PersesProviderInnerProps = Omit<PersesProviderProps, 'syncToUrl'> & { syncToUrl: boolean };

/**
 * Inner component that must be a child of QueryParamProvider.
 * useInitialTimeRange and useInitialRefreshInterval call useQueryParams
 * internally, so QueryParamProvider must already be in the tree above.
 */
const PersesProviderInner: React.FC<PersesProviderInnerProps> = ({
  children,
  dashboardResource,
  defaultDuration = DEFAULT_DURATION,
  defaultRefreshInterval = DEFAULT_REFRESH_INTERVAL,
  syncToUrl,
}) => {
  const { muiTheme, chartsTheme } = usePatternFlyTheme();
  const initialTimeRange = useInitialTimeRange(defaultDuration);
  const initialRefreshInterval = useInitialRefreshInterval(defaultRefreshInterval);

  const datasourceApi = useMemo(
    () => new CachedDatasourceAPI(new OdhDatasourceApi(PERSES_PROXY_BASE_PATH)),
    [],
  );

  const TimeRangeProvider = syncToUrl ? TimeRangeProviderWithQueryParams : TimeRangeProviderBasic;

  return (
    <ThemeProvider theme={muiTheme}>
      <ChartsProvider chartsTheme={chartsTheme}>
        <SnackbarProvider
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          variant="default"
        >
          <PluginRegistry pluginLoader={pluginLoader}>
            <TimeRangeProvider
              initialTimeRange={initialTimeRange}
              initialRefreshInterval={initialRefreshInterval}
            >
              <VariableProvider initialVariableDefinitions={dashboardResource.spec.variables}>
                <DatasourceStoreProvider
                  dashboardResource={dashboardResource}
                  datasourceApi={datasourceApi}
                >
                  <DataQueriesProvider definitions={[]}>
                    <DashboardProvider
                      initialState={{
                        isEditMode: false,
                        dashboardResource,
                      }}
                    >
                      {children}
                    </DashboardProvider>
                  </DataQueriesProvider>
                </DatasourceStoreProvider>
              </VariableProvider>
            </TimeRangeProvider>
          </PluginRegistry>
        </SnackbarProvider>
      </ChartsProvider>
    </ThemeProvider>
  );
};

const PersesProvider: React.FC<PersesProviderProps> = ({ syncToUrl = false, ...props }) => {
  const [queryClient] = React.useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <QueryParamProvider adapter={ReactRouter6Adapter}>
        <PersesProviderInner syncToUrl={syncToUrl} {...props} />
      </QueryParamProvider>
    </QueryClientProvider>
  );
};

export default PersesProvider;
