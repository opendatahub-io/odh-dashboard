import * as React from 'react';
import { Switch, Route, useRouteMatch, Redirect } from 'react-router-dom';
import ProjectDetails from './screens/detail/ProjectDetails';
import ProjectView from './ProjectView';

const ProjectViewRoutes: React.FC = () => {
  const { path } = useRouteMatch();

  return (
    <Switch>
      <Route exact path={path}>
        <ProjectView />
      </Route>
      <Route exact path={`${path}/:namespace`}>
        <ProjectDetails />
      </Route>
      <Route>
        <Redirect to={path} />
      </Route>
    </Switch>
  );
};

export default ProjectViewRoutes;
