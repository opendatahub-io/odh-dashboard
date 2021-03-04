import React from 'react';
import { Route, Switch } from 'react-router-dom';
const InstalledApplications = React.lazy(
  () => import('../pages/enabledApplications/EnabledApplications'),
);
const ExploreApplications = React.lazy(
  () => import('../pages/exploreApplication/ExploreApplications'),
);
const LearningPathsPage = React.lazy(() => import('../pages/learningPaths/LearningPaths'));
const NotFound = React.lazy(() => import('../pages/NotFound'));

const Routes: React.FC = () => (
  <React.Suspense
    fallback={
      <div className="route-loading">
        <h1>Loading...</h1>
      </div>
    }
  >
    <Switch>
      <Route path="/" exact component={InstalledApplications} />
      <Route path="/explore" exact component={ExploreApplications} />
      <Route path="/learningpaths" exact component={LearningPathsPage} />
      <Route component={NotFound} />
    </Switch>
  </React.Suspense>
);

export default Routes;
