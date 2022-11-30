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
import { detectUser } from '../redux/actions/actions';
import Header from './Header';
import AppRoutes from './AppRoutes';
import NavSidebar from './NavSidebar';
import ToastNotifications from '../components/ToastNotifications';
import AppNotificationDrawer from './AppNotificationDrawer';
import { useWatchBuildStatus } from '../utilities/useWatchBuildStatus';
import { AppContext } from './AppContext';
import { useApplicationSettings } from './useApplicationSettings';
import { useUser } from '../redux/selectors';
import TelemetrySetup from './TelemetrySetup';
import { logout } from './appUtils';
import { useAppDispatch } from '../redux/hooks';

import './App.scss';

const App: React.FC = () => {
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const { username, userError, isAllowed } = useUser();
  const dispatch = useAppDispatch();

  const buildStatuses = useWatchBuildStatus();
  const {
    dashboardConfig,
    loaded: configLoaded,
    loadError: fetchConfigError,
  } = useApplicationSettings();

  React.useEffect(() => {
    dispatch(detectUser());
  }, [dispatch]);

  if (!username || !configLoaded || !dashboardConfig) {
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

    // Assume we are still waiting on the API to finish
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <AppContext.Provider
      value={{
        buildStatuses,
        dashboardConfig,
      }}
    >
      <Page
        className="odh-dashboard"
        isManagedSidebar
        header={<Header onNotificationsClick={() => setNotificationsOpen(!notificationsOpen)} />}
        sidebar={isAllowed ? <NavSidebar /> : undefined}
        notificationDrawer={<AppNotificationDrawer onClose={() => setNotificationsOpen(false)} />}
        isNotificationDrawerExpanded={notificationsOpen}
        mainContainerId="dashboard-page-main"
      >
        <AppRoutes />
        <ToastNotifications />
        <TelemetrySetup />
      </Page>
    </AppContext.Provider>
  );
};

export default App;
