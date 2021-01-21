import React, { lazy, Suspense } from 'react';
import { Route, Switch } from 'react-router-dom';
const Launcher = lazy(() => import('../main/Launcher'));
// const Placehoder = lazy(() => import("../../main/Placeholder"));
const NotFound = lazy(() => import('../main/NotFound'));

const Routes: React.FC = () => (
  <Suspense
    fallback={
      <div className="route-loading">
        <h1>Loading...</h1>
      </div>
    }
  >
    <Switch>
      <Route path="/" exact component={Launcher} />
      {/*<Route path="/docs/*" exact component={Placehoder} />*/}
      <Route component={NotFound} />
    </Switch>
  </Suspense>
);

export default Routes;
