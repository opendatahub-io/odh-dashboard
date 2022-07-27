import * as React from 'react';
import { Button, ActionList, ActionListItem } from '@patternfly/react-core';
import ApplicationsPage from '../ApplicationsPage';
import SpawnerPage from './SpawnerPage';
import NotebookServerDetails from './NotebookServerDetails';
import AppContext from '../../app/AppContext';
import { useWatchImages } from '../../utilities/useWatchImages';
import { useWatchDashboardConfig } from 'utilities/useWatchDashboardConfig';
import { useWatchNotebook } from 'utilities/useWatchNotebook';
import { deleteNotebook } from '../../services/notebookService';
import { useSelector } from 'react-redux';
import { State } from 'redux/types';
import {
  generateNotebookNameFromUsername,
  usernameTranslate,
} from '../../utilities/notebookControllerUtils';
import { FAST_POLL_INTERVAL, ODH_NOTEBOOK_REPO, POLL_INTERVAL } from '../../utilities/const';
import NotebookControllerContext from './NotebookControllerContext';
import StartServerModal from './StartServerModal';
import { patchDashboardConfig } from '../../services/dashboardConfigService';
import { NotebookControllerUserState } from '../../types';
import QuickStarts from '../../app/QuickStarts';

export const NotebookController: React.FC = React.memo(() => {
  const { setIsNavOpen } = React.useContext(AppContext);
  const { images } = useWatchImages();
  const { dashboardConfig } = useWatchDashboardConfig();
  const [username, namespace] = useSelector<State, [string, string]>((state) => [
    state.appState.user || '',
    state.appState.namespace || '',
  ]);
  const projectName = ODH_NOTEBOOK_REPO || namespace;
  const {
    notebook,
    loaded,
    loadError,
    forceUpdate: updateNotebook,
    setPollInterval: setNotebookPollInterval,
  } = useWatchNotebook(projectName);
  const isNotebookRunning = !!(
    notebook?.status?.readyReplicas && notebook?.status?.readyReplicas >= 1
  );

  const [startShown, setStartShown] = React.useState<boolean>(false);

  React.useEffect(() => {
    const checkUserState = async () => {
      if (username && dashboardConfig.spec.notebookController) {
        const translatedUsername = usernameTranslate(username);
        const notebookControllerState = dashboardConfig.status?.notebookControllerState;
        const fetchedUserState = notebookControllerState?.find(
          (state) => state.user === translatedUsername,
        );
        if (!fetchedUserState) {
          const newUserState: NotebookControllerUserState = {
            user: translatedUsername,
            lastSelectedImage: '',
            lastSelectedSize: '',
          };
          const patch = {
            status: {
              notebookControllerState: notebookControllerState
                ? [...notebookControllerState, newUserState]
                : [newUserState],
            },
          };
          await patchDashboardConfig(patch);
        }
      }
    };
    checkUserState().catch((e) => console.error(e));
  }, [username, dashboardConfig, namespace]);

  React.useEffect(() => {
    setNotebookPollInterval(startShown ? FAST_POLL_INTERVAL : POLL_INTERVAL);
  }, [startShown, setNotebookPollInterval]);

  React.useEffect(() => {
    setIsNavOpen(false);
  }, [setIsNavOpen]);

  const onModalClose = () => {
    setStartShown(false);
    if (notebook) {
      deleteNotebook(projectName, notebook?.metadata.name).catch((e) => console.error(e));
    }
  };

  return (
    <QuickStarts>
      <NotebookControllerContext.Provider
        value={{
          images,
          dashboardConfig,
          notebook,
          isNotebookRunning,
          projectName,
        }}
      >
        <ApplicationsPage
          title={!isNotebookRunning ? 'Start a Notebook server' : 'Notebook server control panel'}
          description={!isNotebookRunning ? 'Select options for your Notebook server.' : null}
          loaded={loaded}
          loadError={loadError}
          empty={!isNotebookRunning}
          emptyStatePage={
            <SpawnerPage
              setStartModalShown={setStartShown}
              updateNotebook={updateNotebook}
              setNotebookPollInterval={setNotebookPollInterval}
            />
          }
        >
          {notebook && (
            <div className="odh-notebook-controller__page">
              <ActionList>
                <ActionListItem
                  onClick={() => {
                    deleteNotebook(projectName, generateNotebookNameFromUsername(username))
                      .then(() => {
                        updateNotebook();
                      })
                      .catch((e) => console.error(e));
                  }}
                >
                  <Button variant="primary">Stop notebook server</Button>
                </ActionListItem>
                <ActionListItem>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      window.open(notebook?.metadata.annotations?.['opendatahub.io/link']);
                    }}
                  >
                    Return to server
                  </Button>
                </ActionListItem>
              </ActionList>
              <NotebookServerDetails />
            </div>
          )}
        </ApplicationsPage>
        {startShown && (
          <StartServerModal
            startShown={startShown}
            setStartModalShown={setStartShown}
            onClose={onModalClose}
          />
        )}
      </NotebookControllerContext.Provider>
    </QuickStarts>
  );
});

NotebookController.displayName = 'NotebookController';

export default NotebookController;
