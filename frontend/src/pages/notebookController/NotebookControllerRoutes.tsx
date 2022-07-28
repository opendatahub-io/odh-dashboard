import * as React from 'react';
import { Switch, Route, useRouteMatch } from 'react-router-dom';
import { NotebookControllerUserState } from '../../types';
import { EMPTY_USER_STATE } from './const';
import QuickStarts from '../../app/QuickStarts';
import NotebookController from './NotebookController';
import NotebookControllerContext from './NotebookControllerContext';
import NotebookControlPanelRedirect from './NotebookControlPanelRedirect';
import SpawnerPage from './SpawnerPage';

const NotebookControllerRoutes: React.FC = () => {
  const { path } = useRouteMatch();
  const [currentUserState, setCurrentUserState] =
    React.useState<NotebookControllerUserState>(EMPTY_USER_STATE);

  return (
    <QuickStarts>
      <NotebookControllerContext.Provider
        value={{
          setCurrentUserState,
          currentUserState,
        }}
      >
        <Switch>
          <Route exact path={path}>
            <NotebookController />
          </Route>
          <Route exact path={`${path}/spawner`}>
            <SpawnerPage />
          </Route>
          <Route exact path={`${path}/:username/home`}>
            <NotebookControlPanelRedirect />
          </Route>
        </Switch>
      </NotebookControllerContext.Provider>
    </QuickStarts>
  );
};

export default NotebookControllerRoutes;
