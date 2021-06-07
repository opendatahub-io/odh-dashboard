import React from 'react';
import { useDispatch } from 'react-redux';
import '@patternfly/patternfly/patternfly.min.css';
import { Page } from '@patternfly/react-core';
import { detectUser } from '../redux/actions/actions';
import { useDesktopWidth } from '../utilities/useDesktopWidth';
import Header from './Header';
import Routes from './Routes';
import NavSidebar from './NavSidebar';
import ToastNotifications from '../components/ToastNotifications';
import { useWatchBuildStatus } from '../utilities/useWatchBuildStatus';

import './App.scss';

const App: React.FC = () => {
  const isDeskTop = useDesktopWidth();
  const [isNavOpen, setIsNavOpen] = React.useState(isDeskTop);
  const dispatch = useDispatch();

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
      header={<Header isNavOpen={isNavOpen} onNavToggle={onNavToggle} />}
      sidebar={<NavSidebar isNavOpen={isNavOpen} />}
    >
      <Routes />
      <ToastNotifications />
    </Page>
  );
};

export default App;
