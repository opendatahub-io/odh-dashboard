import React from 'react';
import { connect } from 'react-redux';
import '@patternfly/react-core/dist/styles/base.css';
import { Page } from '@patternfly/react-core';
import { detectUser } from '../redux/actions/actions';
import Header from './Header';
import Routes from './Routes';
import NavSidebar from './NavSidebar';

import './App.scss';

type AppProps = {
  detectUser: () => void;
};

const _App: React.FC<AppProps> = ({ detectUser }) => {
  const [isNavOpen, setIsNavOpen] = React.useState(true);

  React.useEffect(() => {
    detectUser();
  }, []);

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

const mapStateToProps = (state) => {
  return state.appReducer;
};

const mapDispatchToProps = (dispatch) => ({
  detectUser: () => {
    dispatch(detectUser());
  },
});

const App = connect(mapStateToProps, mapDispatchToProps)(_App);

export default App;
