import React from 'react';
import '@patternfly/patternfly/patternfly.min.css';
import '@patternfly/patternfly/patternfly-addons.css';
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
import ErrorBoundary from '~/components/error/ErrorBoundary';
import ToastNotifications from '~/components/ToastNotifications';
import { useWatchBuildStatus } from '~/utilities/useWatchBuildStatus';
import { useUser } from '~/redux/selectors';
import { DASHBOARD_MAIN_CONTAINER_ID } from '~/utilities/const';
import useDetectUser from '~/utilities/useDetectUser';
import ProjectsContextProvider from '~/concepts/projects/ProjectsContext';
import useStorageClasses from '~/concepts/k8s/useStorageClasses';
import AreaContextProvider from '~/concepts/areas/AreaContext';
import Header from './Header';
import AppRoutes from './AppRoutes';
import NavSidebar from './NavSidebar';
import AppNotificationDrawer from './AppNotificationDrawer';
import { AppContext } from './AppContext';
import { useApplicationSettings } from './useApplicationSettings';
import TelemetrySetup from './TelemetrySetup';
import { logout } from './appUtils';
import QuickStarts from './QuickStarts';

import './App.scss';

const App: React.FC = () => {
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const { username, userError, isAllowed } = useUser();

  const buildStatuses = useWatchBuildStatus();
  const {
    dashboardConfig,
    loaded: configLoaded,
    loadError: fetchConfigError,
  } = useApplicationSettings();

  const [storageClasses] = useStorageClasses();

  useDetectUser();

  const contextValue = React.useMemo(
    () =>
      dashboardConfig
        ? {
            buildStatuses,
            dashboardConfig,
            storageClasses,
          }
        : null,
    [buildStatuses, dashboardConfig, storageClasses],
  );

  // We lack the critical data to startup the app
  if (userError || fetchConfigError) {
    // There was an error fetching critical data
    return (
      <Page>
        <PageSection>
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

  return (
    <AreaContextProvider>
      {loading ? (
        <Bullseye>
          <Spinner />
        </Bullseye>
      ) : (
        <AppContext.Provider value={contextValue}>
          <Page
            className="odh-dashboard"
            isManagedSidebar
            header={
              <Header onNotificationsClick={() => setNotificationsOpen(!notificationsOpen)} />
            }
            sidebar={isAllowed ? <NavSidebar /> : undefined}
            notificationDrawer={
              <AppNotificationDrawer onClose={() => setNotificationsOpen(false)} />
            }
            isNotificationDrawerExpanded={notificationsOpen}
            mainContainerId={DASHBOARD_MAIN_CONTAINER_ID}
            data-testid={DASHBOARD_MAIN_CONTAINER_ID}
          >
            <ErrorBoundary>
              <ProjectsContextProvider>
                <QuickStarts>
                  <AppRoutes />
                </QuickStarts>
              </ProjectsContextProvider>
              <ToastNotifications />
              <TelemetrySetup />
            </ErrorBoundary>
          </Page>
        </AppContext.Provider>
      )}
    </AreaContextProvider>
  );
};

export default App;
