import * as React from 'react';
import { Button, ActionList, ActionListItem } from '@patternfly/react-core';
import ApplicationsPage from '../ApplicationsPage';
import NotebookServerDetails from './NotebookServerDetails';
import AppContext from '../../app/AppContext';
import { useWatchImages } from '../../utilities/useWatchImages';
import { useWatchNotebook } from 'utilities/useWatchNotebook';
import { deleteNotebook } from '../../services/notebookService';
import { useSelector } from 'react-redux';
import { State } from '../../redux/types';
import {
  checkNotebookRunning,
  generateNotebookNameFromUsername,
  getUserStateFromDashboardConfig,
  usernameTranslate,
} from '../../utilities/notebookControllerUtils';
import { ODH_NOTEBOOK_REPO } from '../../utilities/const';
import { patchDashboardConfig } from '../../services/dashboardConfigService';
import { Redirect, useHistory } from 'react-router-dom';
import NotebookControllerContext from './NotebookControllerContext';

import './NotebookController.scss';

export const NotebookController: React.FC = React.memo(() => {
  const history = useHistory();
  const { setIsNavOpen, dashboardConfig } = React.useContext(AppContext);
  const { images } = useWatchImages();
  const { currentUserState, setCurrentUserState } = React.useContext(NotebookControllerContext);
  const stateUsername = useSelector<State, string>((state) => state.appState.user || '');
  const username = currentUserState.user || stateUsername;
  const translatedUsername = usernameTranslate(username);
  const namespace = useSelector<State, string>((state) => state.appState.namespace || '');
  const projectName = ODH_NOTEBOOK_REPO || namespace;
  const { notebook, loaded, loadError } = useWatchNotebook(projectName, username);

  React.useEffect(() => {
    const checkUserState = async () => {
      if (translatedUsername && dashboardConfig.spec.notebookController) {
        const notebookControllerState = dashboardConfig.status?.notebookControllerState || [];
        const fetchedUserState = getUserStateFromDashboardConfig(
          translatedUsername,
          notebookControllerState,
        );
        if (!fetchedUserState) {
          currentUserState.user = username;
          const patch = {
            status: {
              notebookControllerState: notebookControllerState
                ? [...notebookControllerState, currentUserState]
                : [currentUserState],
            },
          };
          await patchDashboardConfig(patch);
        } else {
          setCurrentUserState(fetchedUserState);
        }
      }
    };
    checkUserState().catch((e) => console.error(e));
  }, [translatedUsername, dashboardConfig, currentUserState, setCurrentUserState, username]);

  React.useEffect(() => {
    setIsNavOpen(false);
  }, [setIsNavOpen]);

  return (
    <ApplicationsPage
      title="Notebook server control panel"
      description={null}
      loaded={loaded}
      loadError={loadError}
      empty={loaded && !checkNotebookRunning(notebook)}
      emptyStatePage={<Redirect to={`/notebookController/spawner`} />}
    >
      {notebook && (
        <div className="odh-notebook-controller__page">
          <ActionList>
            <ActionListItem
              onClick={() => {
                deleteNotebook(projectName, generateNotebookNameFromUsername(username))
                  .then(() => {
                    history.push(`/notebookController/spawner`);
                  })
                  .catch((e) => console.error(e));
              }}
            >
              <Button variant="primary">Stop notebook server</Button>
            </ActionListItem>
            <ActionListItem
              onClick={() => {
                if (notebook?.metadata.annotations?.['opendatahub.io/link']) {
                  window.location.href = notebook.metadata.annotations['opendatahub.io/link'];
                }
              }}
            >
              <Button variant="secondary">Return to server</Button>
            </ActionListItem>
          </ActionList>
          <NotebookServerDetails notebook={notebook} images={images} />
        </div>
      )}
    </ApplicationsPage>
  );
});

NotebookController.displayName = 'NotebookController';

export default NotebookController;
