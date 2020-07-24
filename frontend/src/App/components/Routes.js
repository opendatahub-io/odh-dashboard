import React, { lazy, Suspense } from "react";
import { Route, Switch, Redirect } from "react-router-dom";

const Launcher = lazy(() => import("../../main/Launcher"));
const NotFound = lazy(() => import("../../main/NotFound"));

export const Routes = () => (
  <Suspense
    fallback={
      <div className="route-loading">
        <h1>Loading...</h1>
      </div>
    }
  >
    <Switch>
      <Route path="/" exact component={Launcher} />
      <Route component={NotFound} />
    </Switch>
  </Suspense>
);
