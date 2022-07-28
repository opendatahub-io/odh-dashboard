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
  validateNotebookNamespaceRoleBinding,
} from '../../utilities/notebookControllerUtils';
import { patchDashboardConfig } from '../../services/dashboardConfigService';
import { Redirect, useHistory } from 'react-router-dom';
import NotebookControllerContext from './NotebookControllerContext';
import useNotification from '../../utilities/useNotification';

import './NotebookController.scss';

export const NotebookController: React.FC = React.memo(() => {
  const history = useHistory();
  const notification = useNotification();
  const { setIsNavOpen, dashboardConfig } = React.useContext(AppContext);
  const { images } = useWatchImages();
  const { currentUserState, setCurrentUserState } = React.useContext(NotebookControllerContext);
  const stateUsername = useSelector<State, string>((state) => state.appState.user || '');
  const username = currentUserState.user || stateUsername;
  const translatedUsername = usernameTranslate(username);
  const dashboardNamespace = useSelector<State, string>(
    (state) => state.appState.dashboardNamespace || '',
  );
  const notebookNamespace = dashboardConfig.spec.notebookController?.notebookNamespace;
  const projectName = notebookNamespace || dashboardNamespace;
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
    if (notebookNamespace && dashboardNamespace) {
      validateNotebookNamespaceRoleBinding(notebookNamespace, dashboardNamespace).catch((e) =>
        notification.error(
          'Error validating the role binding of your notebookNamespace',
          `${e.response.data.message}. You might not be able to create the notebook in this namespace.`,
        ),
      );
    }
  }, [notebookNamespace, dashboardNamespace, notification]);

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
