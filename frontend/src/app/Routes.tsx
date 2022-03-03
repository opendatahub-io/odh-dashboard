import React from 'react';
import { Route, Switch } from 'react-router-dom';
import ApplicationsPage from '../pages/ApplicationsPage';
const InstalledApplications = React.lazy(
  () => import('../pages/enabledApplications/EnabledApplications'),
);
const ExploreApplications = React.lazy(
  () => import('../pages/exploreApplication/ExploreApplications'),
);
const DataProjects = React.lazy(() => import('../pages/dataProjects/DataProjects'));
const DataProjectDetails = React.lazy(() => import('../pages/dataProjects/DataProjectDetails'));
const LearningCenterPage = React.lazy(() => import('../pages/learningCenter/LearningCenter'));
const NotFound = React.lazy(() => import('../pages/NotFound'));

const Routes: React.FC = () => (
  <React.Suspense
    fallback={<ApplicationsPage title="" description="" loaded={false} empty={true} />}
  >
    <Switch>
      <Route path="/" exact component={InstalledApplications} />
      <Route path="/explore" exact component={ExploreApplications} />
      <Route path="/data-projects" exact component={DataProjects} />
      <Route path="/data-projects/:projectName" exact component={DataProjectDetails} />
      <Route path="/resources" exact component={LearningCenterPage} />
      <Route component={NotFound} />
    </Switch>
  </React.Suspense>
);

export default Routes;
