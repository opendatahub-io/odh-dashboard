import React from 'react';
import '@patternfly/patternfly/patternfly.min.css';
import '@patternfly/patternfly/patternfly-addons.css';
import '@patternfly/patternfly/patternfly-charts.css';
import {
  Alert,
  Bullseye,
  Button,
  Page,
  PageSection,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from '#~/components/error/ErrorBoundary';
import ToastNotifications from '#~/components/ToastNotifications';
import { useWatchBuildStatus } from '#~/utilities/useWatchBuildStatus';
import { useUser } from '#~/redux/selectors';
import { DASHBOARD_MAIN_CONTAINER_ID } from '#~/utilities/const';
import useDetectUser from '#~/utilities/useDetectUser';
import ProjectsContextProvider from '#~/concepts/projects/ProjectsContext';
import { ModelRegistriesContextProvider } from '#~/concepts/modelRegistry/context/ModelRegistriesContext';
import useStorageClasses from '#~/concepts/k8s/useStorageClasses';
import AreaContextProvider from '#~/concepts/areas/AreaContext';
import { NimContextProvider } from '#~/concepts/nimServing/NIMAvailabilityContext';
import { NotificationWatcherContextProvider } from '#~/concepts/notificationWatcher/NotificationWatcherContext';
import { AccessReviewProvider } from '#~/concepts/userSSAR';
import { ExtensibilityContextProvider } from '#~/plugins/ExtensibilityContext';
import useFetchDscStatus from '#~/concepts/areas/useFetchDscStatus';
import { PluginStoreAreaFlagsProvider } from '#~/plugins/PluginStoreAreaFlagsProvider';
import { OdhPlatformType } from '#~/types';
import useDevFeatureFlags from './useDevFeatureFlags';
import Header from './Header';
import AppRoutes from './AppRoutes';
import NavSidebar from './NavSidebar';
import AppNotificationDrawer from './AppNotificationDrawer';
import { AppContext } from './AppContext';
import { useApplicationSettings } from './useApplicationSettings';
import TelemetrySetup from './TelemetrySetup';
import { logout } from './appUtils';
import QuickStarts from './QuickStarts';
import DevFeatureFlagsBanner from './DevFeatureFlagsBanner';
import SessionExpiredModal from './SessionExpiredModal';

import './App.scss';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
    },
  },
});

const App: React.FC = () => {
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const { username, userError, isAllowed } = useUser();

  const buildStatuses = useWatchBuildStatus();
  const {
    dashboardConfig: dashboardConfigFromServer,
    loaded: configLoaded,
    loadError: fetchConfigError,
  } = useApplicationSettings();

  const { dashboardConfig, ...devFeatureFlagsProps } =
    useDevFeatureFlags(dashboardConfigFromServer);

  const [storageClasses] = useStorageClasses();

  useDetectUser();

  const [dscStatus] = useFetchDscStatus();
  const contextValue = React.useMemo(() => {
    if (!dashboardConfig) {
      return null;
    }
    const releaseName = dscStatus?.release?.name;
    const workbenchNamespace = dscStatus?.components?.workbenches?.workbenchNamespace;

    return {
      buildStatuses,
      dashboardConfig,
      workbenchNamespace,
      storageClasses,
      isRHOAI:
        releaseName === OdhPlatformType.SELF_MANAGED_RHOAI ||
        releaseName === OdhPlatformType.MANAGED_RHOAI,
    };
  }, [
    dashboardConfig,
    dscStatus?.release?.name,
    dscStatus?.components?.workbenches?.workbenchNamespace,
    buildStatuses,
    storageClasses,
  ]);

  const isUnauthorized = fetchConfigError?.request?.status === 403;

  // We lack the critical data to startup the app
  if (userError || fetchConfigError) {
    // Check for unauthorized state
    if (isUnauthorized) {
      return <SessionExpiredModal />;
    }

    // Default error handling for other cases
    return (
      // TODO: Remove when PF breaking-change issue is fixed.
      // https://github.com/patternfly/patternfly-react/issues/11797
      // https://issues.redhat.com/browse/RHOAIENG-24716
      <Page sidebar={null}>
        <PageSection hasBodyWrapper={false}>
          <Stack hasGutter>
            <StackItem>
              <Alert variant="danger" isInline title="General loading error">
                <p>
                  {(userError ? userError.message : fetchConfigError?.message) ||
                    'Unknown error occurred during startup.'}
                </p>
                <p>Logging out and logging back in may solve the issue.</p>
              </Alert>
            </StackItem>
            <StackItem>
              <Button
                variant="secondary"
                onClick={() => logout().then(() => window.location.reload())}
              >
                Logout
              </Button>
            </StackItem>
          </Stack>
        </PageSection>
      </Page>
    );
  }

  // Waiting on the API to finish
  const loading = !username || !configLoaded || !dashboardConfig || !contextValue;

  if (loading) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppContext.Provider value={contextValue}>
        <AreaContextProvider flags={devFeatureFlagsProps.devFeatureFlags}>
          <PluginStoreAreaFlagsProvider />
          <AccessReviewProvider>
            <Page
              className="odh-dashboard"
              isManagedSidebar
              isContentFilled
              masthead={
                <Header onNotificationsClick={() => setNotificationsOpen(!notificationsOpen)} />
              }
              sidebar={isAllowed ? <NavSidebar /> : undefined}
              notificationDrawer={
                <AppNotificationDrawer onClose={() => setNotificationsOpen(false)} />
              }
              isNotificationDrawerExpanded={notificationsOpen}
              mainContainerId={DASHBOARD_MAIN_CONTAINER_ID}
              data-testid={DASHBOARD_MAIN_CONTAINER_ID}
              banner={
                <DevFeatureFlagsBanner
                  dashboardConfig={dashboardConfig.spec.dashboardConfig}
                  {...devFeatureFlagsProps}
                />
              }
            >
              <ErrorBoundary>
                <NimContextProvider>
                  <ProjectsContextProvider>
                    <ModelRegistriesContextProvider>
                      <QuickStarts>
                        <NotificationWatcherContextProvider>
                          <AppRoutes />
                        </NotificationWatcherContextProvider>
                      </QuickStarts>
                    </ModelRegistriesContextProvider>
                  </ProjectsContextProvider>
                </NimContextProvider>
                <ToastNotifications />
                <TelemetrySetup />
              </ErrorBoundary>
            </Page>
          </AccessReviewProvider>
        </AreaContextProvider>
      </AppContext.Provider>
    </QueryClientProvider>
  );
};

const AppWrapper: React.FC = () => (
  <ExtensibilityContextProvider>
    <App />
  </ExtensibilityContextProvider>
);

export default AppWrapper;
