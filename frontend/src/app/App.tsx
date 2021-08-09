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

import './App.scss';

const App: React.FC = () => {
  const isDeskTop = useDesktopWidth();
  const [isNavOpen, setIsNavOpen] = React.useState(isDeskTop);
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const dispatch = useDispatch();
  useSegmentTracking();
  useTrackHistory();

  useWatchBuildStatus();

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
    <Page
      className="odh-dashboard"
      header={
        <Header
          isNavOpen={isNavOpen}
          onNavToggle={onNavToggle}
          onNotificationsClick={() => setNotificationsOpen(!notificationsOpen)}
        />
      }
      sidebar={<NavSidebar isNavOpen={isNavOpen} />}
      notificationDrawer={<AppNotificationDrawer onClose={() => setNotificationsOpen(false)} />}
      isNotificationDrawerExpanded={notificationsOpen}
    >
      <Routes />
      <ToastNotifications />
    </Page>
  );
};

export default App;
