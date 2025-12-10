import React, { useMemo } from 'react';
import { ThemeProvider } from '@mui/material';
import { ChartsProvider, SnackbarProvider } from '@perses-dev/components';
import { DashboardResource } from '@perses-dev/core';
import {
  DashboardProvider,
  DatasourceStoreProvider,
  VariableProvider,
} from '@perses-dev/dashboards';
import {
  DataQueriesProvider,
  PluginRegistry,
  TimeRangeProviderWithQueryParams,
  useInitialTimeRange,
  useInitialRefreshInterval,
} from '@perses-dev/plugin-system';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QueryParamProvider } from 'use-query-params';
import { ReactRouter6Adapter } from 'use-query-params/adapters/react-router-6';
import { pluginLoader } from './persesPluginsLoader';
import { OdhDatasourceApi, CachedDatasourceAPI, PERSES_PROXY_BASE_PATH } from './perses-client';
import { usePatternFlyTheme } from './theme';

// Create a QueryClient instance for react-query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 0,
    },
  },
});

interface PersesWrapperProps {
  children?: React.ReactNode;
  dashboardResource?: DashboardResource;
}

const DEFAULT_DASHBOARD_DURATION = '30m';
const DEFAULT_REFRESH_INTERVAL = '60s';

const PersesWrapperWithQueryParams: React.FC<PersesWrapperProps> = ({
  children,
  dashboardResource,
}) => {
  const { muiTheme, chartsTheme } = usePatternFlyTheme();
  const initialTimeRange = useInitialTimeRange(DEFAULT_DASHBOARD_DURATION);
  const initialRefreshInterval = useInitialRefreshInterval(DEFAULT_REFRESH_INTERVAL);

  const datasourceApi = useMemo(
    () => new CachedDatasourceAPI(new OdhDatasourceApi(PERSES_PROXY_BASE_PATH)),
    [],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={muiTheme}>
        <ChartsProvider chartsTheme={chartsTheme}>
          <SnackbarProvider
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            variant="default"
          >
            <PluginRegistry pluginLoader={pluginLoader}>
              <TimeRangeProviderWithQueryParams
                initialTimeRange={initialTimeRange}
                initialRefreshInterval={initialRefreshInterval}
              >
                <VariableProvider initialVariableDefinitions={dashboardResource?.spec.variables}>
                  <DatasourceStoreProvider
                    dashboardResource={dashboardResource}
                    datasourceApi={datasourceApi}
                  >
                    <DataQueriesProvider definitions={[]}>
                      {dashboardResource ? (
                        <DashboardProvider
                          initialState={{
                            isEditMode: false,
                            dashboardResource,
                          }}
                        >
                          {children}
                        </DashboardProvider>
                      ) : (
                        <>{children}</>
                      )}
                    </DataQueriesProvider>
                  </DatasourceStoreProvider>
                </VariableProvider>
              </TimeRangeProviderWithQueryParams>
            </PluginRegistry>
          </SnackbarProvider>
        </ChartsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

const PersesWrapper: React.FC<PersesWrapperProps> = ({ children, dashboardResource }) => {
  return (
    <QueryParamProvider adapter={ReactRouter6Adapter}>
      <PersesWrapperWithQueryParams dashboardResource={dashboardResource}>
        {children}
      </PersesWrapperWithQueryParams>
    </QueryParamProvider>
  );
};

export default PersesWrapper;
