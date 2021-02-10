import React from 'react';
import { connect } from 'react-redux';
import { Page } from '@patternfly/react-core';
import { detectUser } from '../redux/actions/actions';
import Header from './Header';
import Routes from './Routes';
import NavSidebar from './NavSidebar';
// import { QuickStarts } from './QuickStarts';
import { QuickStartContext, QuickStartContextValues } from '@cloudmosaic/quickstarts';

import './App.scss';

type AppProps = {
  detectUser: () => void;
};

const _App: React.FC<AppProps> = ({ detectUser }) => {
  const [isNavOpen, setIsNavOpen] = React.useState(true);

  React.useEffect(() => {
    detectUser();
  }, [detectUser]);

  const onNavToggle = () => {
    setIsNavOpen(!isNavOpen);
  };

  const qsContext = React.useContext<QuickStartContextValues>(QuickStartContext);

  return (
    // <QuickStarts>
    //   <button
    //     onClick={() =>
    //       qsContext.setActiveQuickStart && qsContext.setActiveQuickStart('template-id')
    //     }
    //   >
    //     Open a quickstart from a nested component
    //   </button>
      <Page
        className="odh-dashboard"
        header={<Header isNavOpen={isNavOpen} onNavToggle={onNavToggle} />}
        sidebar={<NavSidebar isNavOpen={isNavOpen} />}
      >
        <Routes />
      </Page>
    // </QuickStarts>
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
