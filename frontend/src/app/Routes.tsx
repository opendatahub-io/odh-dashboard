import React from 'react';
import { Route, Switch } from 'react-router-dom';
import ApplicationsPage from '../pages/ApplicationsPage';
import { State } from '../redux/types';
import { useSelector } from 'react-redux';

const InstalledApplications = React.lazy(
  () => import('../pages/enabledApplications/EnabledApplications'),
);
const ExploreApplications = React.lazy(
  () => import('../pages/exploreApplication/ExploreApplications'),
);

const ClusterSettingsPage = React.lazy(() => import('../pages/clusterSettings/ClusterSettings'));
const DataProjects = React.lazy(() => import('../pages/dataProjects/DataProjects'));
const DataProjectDetails = React.lazy(() => import('../pages/dataProjects/DataProjectDetails'));
const LearningCenterPage = React.lazy(() => import('../pages/learningCenter/LearningCenter'));
const NotFound = React.lazy(() => import('../pages/NotFound'));

const Routes: React.FC = () => {
  const isAdmin = useSelector<State, boolean>((state) => state.appState.isAdmin || false);

  return (
    <React.Suspense
      fallback={<ApplicationsPage title="" description="" loaded={false} empty={true} />}
    >
      <Switch>
        <Route path="/" exact component={InstalledApplications} />
        <Route path="/explore" exact component={ExploreApplications} />
        <Route path="/data-projects" exact component={DataProjects} />
        <Route path="/data-projects/:projectName" exact component={DataProjectDetails} />
        <Route path="/resources" exact component={LearningCenterPage} />
        {isAdmin && <Route path="/clusterSettings" exact component={ClusterSettingsPage} />}
        <Route component={NotFound} />
      </Switch>
    </React.Suspense>
  );
};

export default Routes;
