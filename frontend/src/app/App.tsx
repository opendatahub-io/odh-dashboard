import React from 'react';
import { useDispatch } from 'react-redux';
import '@patternfly/patternfly/patternfly.min.css';
import { Page } from '@patternfly/react-core';
import { detectUser } from '../redux/actions/actions';
import Header from './Header';
import Routes from './Routes';
import NavSidebar from './NavSidebar';

import './App.scss';

const App: React.FC = () => {
  const [isNavOpen, setIsNavOpen] = React.useState(true);
  const dispatch = useDispatch();

  React.useEffect(() => {
    dispatch(detectUser());
  }, [dispatch]);

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
    </Page>
  );
};

export default App;
