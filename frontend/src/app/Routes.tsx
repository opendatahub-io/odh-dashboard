import React from 'react';
import { Route, Switch } from 'react-router-dom';
import ApplicationsPage from '../pages/ApplicationsPage';
import { State } from '../redux/types';
import { useSelector } from 'react-redux';
import { useWatchDashboardConfig } from '../utilities/useWatchDashboardConfig';

const InstalledApplications = React.lazy(
  () => import('../pages/enabledApplications/EnabledApplications'),
);
const ExploreApplications = React.lazy(
  () => import('../pages/exploreApplication/ExploreApplications'),
);

const ClusterSettingsPage = React.lazy(() => import('../pages/clusterSettings/ClusterSettings'));
const LearningCenterPage = React.lazy(() => import('../pages/learningCenter/LearningCenter'));
const NotFound = React.lazy(() => import('../pages/NotFound'));
const JupyterNotebooks = React.lazy(() => import('../pages/jupyterNotebooks/JupyterNotebooks'));

const Routes: React.FC = () => {
  const { dashboardConfig } = useWatchDashboardConfig();
  const isAdmin = useSelector<State, boolean>((state) => state.appState.isAdmin || false);
  const isNBCEnabled = dashboardConfig.notebookController;

  return (
    <React.Suspense
      fallback={<ApplicationsPage title="" description="" loaded={false} empty={true} />}
    >
      <Switch>
        <Route path="/" exact component={InstalledApplications} />
        <Route path="/explore" exact component={ExploreApplications} />
        <Route path="/resources" exact component={LearningCenterPage} />
        {isAdmin && <Route path="/clusterSettings" exact component={ClusterSettingsPage} />}
        {isNBCEnabled && <Route path="/jupyter-notebooks" exact component={JupyterNotebooks} />}
        <Route component={NotFound} />
      </Switch>
    </React.Suspense>
  );
};

export default Routes;
