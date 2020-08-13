import React, { useEffect } from "react";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";

import { Page } from "@patternfly/react-core";
import { Header, Routes } from "./";
import { getComponents } from "../actions";

import "./App.scss";

const _App = withRouter(({ components, getComponents }) => {
  useEffect(() => {
    getComponents();
  }, []);

  return (
    <Page header={Header} className="app">
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
