import React from 'react';
import { Route, Switch } from 'react-router-dom';
import ApplicationsPage from '../pages/ApplicationsPage';
import { State } from '../redux/types';
import { useSelector } from 'react-redux';
import NotebookControllerRoutes from '../pages/notebookController/NotebookControllerRoutes';

const InstalledApplications = React.lazy(
  () => import('../pages/enabledApplications/EnabledApplications'),
);
const ExploreApplications = React.lazy(
  () => import('../pages/exploreApplication/ExploreApplications'),
);
const NotebookLogoutRedirectPage = React.lazy(
  () => import('../pages/notebookController/NotebookLogoutRedirect'),
);

const ClusterSettingsPage = React.lazy(() => import('../pages/clusterSettings/ClusterSettings'));
const LearningCenterPage = React.lazy(() => import('../pages/learningCenter/LearningCenter'));
const BYONImagesPage = React.lazy(() => import('../pages/BYONImages/BYONImages'));
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
        <Route path="/resources" exact component={LearningCenterPage} />
        <Route path="/notebookController">
          <NotebookControllerRoutes />
        </Route>
        <Route
          path="/notebook/:namespace/:notebookName/logout"
          exact
          component={NotebookLogoutRedirectPage}
        />
        {isAdmin && <Route path="/notebookImages" exact component={BYONImagesPage} />}
        {isAdmin && <Route path="/clusterSettings" exact component={ClusterSettingsPage} />}
        <Route component={NotFound} />
      </Switch>
    </React.Suspense>
  );
};

export default Routes;
