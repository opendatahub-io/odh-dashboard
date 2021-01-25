import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { Page } from '@patternfly/react-core';
import { getComponents } from '../redux/actions/actions';
import Header from './Header';
import Routes from './Routes';

import './App.scss';

type AppProps = {
  getComponents: () => void;
};

const _App: React.FC<AppProps> = ({ getComponents }) => {
  const [isNavOpen, setIsNavOpen] = useState(true);

  useEffect(() => {
    getComponents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onNavToggle = () => {
    setIsNavOpen(!isNavOpen);
  };

  return (
    <Page
      header={<Header isNavOpen={isNavOpen} onNavToggle={onNavToggle} />}
      // sidebar={<NavSidebar isNavOpen={isNavOpen} />}
      isManagedSidebar
      className="app"
    >
      <Routes />
    </Page>
  );
};

const mapStateToProps = (state) => {
  return state.appReducer;
};

const mapDispatchToProps = (dispatch) => ({
  getComponents: () => {
    dispatch(getComponents());
  },
});

const App = connect(mapStateToProps, mapDispatchToProps)(_App);

export default App;
