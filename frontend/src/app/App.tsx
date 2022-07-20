import React from 'react';
import { useDispatch } from 'react-redux';
import '@patternfly/patternfly/patternfly.min.css';
import '@patternfly/patternfly/patternfly-addons.css';
import { Page } from '@patternfly/react-core';
import { detectUser } from '../redux/actions/actions';
import { useDesktopWidth } from '../utilities/useDesktopWidth';
import { useTrackHistory } from '../utilities/useTrackHistory';
import { useSegmentTracking } from '../utilities/useSegmentTracking';
import Header from './Header';
import Routes from './Routes';
import NavSidebar from './NavSidebar';
import ToastNotifications from '../components/ToastNotifications';
import AppNotificationDrawer from './AppNotificationDrawer';
import { useWatchBuildStatus } from '../utilities/useWatchBuildStatus';
import AppContext from './AppContext';

import './App.scss';
import { useWatchDashboardConfig } from 'utilities/useWatchDashboardConfig';

const App: React.FC = () => {
  const isDeskTop = useDesktopWidth();
  const [isNavOpen, setIsNavOpen] = React.useState(isDeskTop);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const dispatch = useDispatch();
  useSegmentTracking();
  useTrackHistory();

  const buildStatuses = useWatchBuildStatus();
  const { dashboardConfig } = useWatchDashboardConfig();

  React.useEffect(() => {
    dispatch(detectUser());
  }, [dispatch]);

  React.useEffect(() => {
    setIsNavOpen(isDeskTop);
  }, [isDeskTop]);

  const onNavToggle = () => {
    setIsNavOpen(!isNavOpen);
  };

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
      </Page>
    </AppContext.Provider>
  );
};

export default App;
