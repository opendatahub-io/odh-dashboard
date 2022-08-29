import * as React from 'react';
import { Switch, Route, useRouteMatch, Redirect } from 'react-router-dom';
import NotebookServer from './NotebookServer';
import NotebookControlPanelRedirect from './NotebookControlPanelRedirect';
import SpawnerPage from './SpawnerPage';

const NotebookServerRoutes: React.FC = () => {
  const { path } = useRouteMatch();

  return (
    <Switch>
      <Route exact path={path}>
        <NotebookServer />
      </Route>
      <Route exact path={`${path}/spawner`}>
        <SpawnerPage />
      </Route>
      <Route exact path={`${path}/:username/(home|spawn)`}>
        <NotebookControlPanelRedirect />
      </Route>
      <Route>
        <Redirect to={path} />
      </Route>
    </Switch>
  );
};

export default NotebookServerRoutes;
