import React from 'react';
import { useDispatch } from 'react-redux';
import '@patternfly/patternfly/patternfly.min.css';
import '@patternfly/patternfly/patternfly-addons.css';
import { Alert, Bullseye, Page, PageSection, Spinner } from '@patternfly/react-core';
import { detectUser } from '../redux/actions/actions';
import { useDesktopWidth } from '../utilities/useDesktopWidth';
import Header from './Header';
import Routes from './Routes';
import NavSidebar from './NavSidebar';
import ToastNotifications from '../components/ToastNotifications';
import AppNotificationDrawer from './AppNotificationDrawer';
import { useWatchBuildStatus } from '../utilities/useWatchBuildStatus';
import { AppContext } from './AppContext';
import { useApplicationSettings } from './useApplicationSettings';
import { useUser } from '../redux/selectors';
import TelemetrySetup from './TelemetrySetup';

import './App.scss';

const App: React.FC = () => {
  const isDeskTop = useDesktopWidth();
  const [isNavOpen, setIsNavOpen] = React.useState(isDeskTop);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const { username, userError } = useUser();
  const dispatch = useDispatch();

  const buildStatuses = useWatchBuildStatus();
  const {
    dashboardConfig,
    loaded: configLoaded,
    loadError: fetchConfigError,
  } = useApplicationSettings();

  React.useEffect(() => {
    dispatch(detectUser());
  }, [dispatch]);

  React.useEffect(() => {
    setIsNavOpen(isDeskTop);
  }, [isDeskTop]);

  const onNavToggle = () => {
    setIsNavOpen(!isNavOpen);
  };

  if (!username || !configLoaded || !dashboardConfig) {
    // We do not have the data yet for who they are, we can't show the app. If we allow anything
    // to render right now, the username is going to be blank and we won't know permissions
    // If we don't get the config we cannot show the pages, either
    if (userError || fetchConfigError) {
      // We likely don't have a username still so just show the error
      // or we likely meet something wrong when fetching the dashboard config, we also show the error
      return (
        <Page>
          <PageSection>
            <Alert variant="danger" isInline title="General loading error">
              {userError ? userError.message : fetchConfigError?.message}
            </Alert>
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
        isNavOpen,
        setIsNavOpen,
        onNavToggle,
        buildStatuses,
        dashboardConfig,
      }}
    >
      <Page
        className="odh-dashboard"
        header={<Header onNotificationsClick={() => setNotificationsOpen(!notificationsOpen)} />}
        sidebar={<NavSidebar />}
        notificationDrawer={<AppNotificationDrawer onClose={() => setNotificationsOpen(false)} />}
        isNotificationDrawerExpanded={notificationsOpen}
      >
        <Routes />
        <ToastNotifications />
        <TelemetrySetup />
      </Page>
    </AppContext.Provider>
  );
};

export default App;
