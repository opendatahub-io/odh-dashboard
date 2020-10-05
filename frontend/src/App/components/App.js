import React, { useState, useEffect } from "react";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";

import { Page } from "@patternfly/react-core";
// import { Header, NavSidebar, Routes } from "./";
import { Header, Routes } from "./";
import { getComponents } from "../actions";

import "./App.scss";

const _App = withRouter(({ getComponents }) => {
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
});

const mapStateToProps = (state) => {
  return state.appReducer;
};

const mapDispatchToProps = (dispatch) => ({
  getComponents: () => {
    dispatch(getComponents());
  },
});

export const App = connect(mapStateToProps, mapDispatchToProps)(_App);
export default App;
