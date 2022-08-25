import * as React from 'react';
import { Redirect, useHistory } from 'react-router-dom';
import { Button, ActionList, ActionListItem, Stack, StackItem } from '@patternfly/react-core';
import { Notebook } from '../../../../types';
import ApplicationsPage from '../../../ApplicationsPage';
import { NotebookControllerContext } from '../../NotebookControllerContext';
import ImpersonateAlert from '../admin/ImpersonateAlert';
import NotebookServerDetails from './NotebookServerDetails';
import StopServerModal from './StopServerModal';

import '../../NotebookController.scss';

export const NotebookServer: React.FC = () => {
  const history = useHistory();
  const {
    currentUserNotebook: notebook,
    currentUserNotebookIsRunning,
    requestNotebookRefresh,
  } = React.useContext(NotebookControllerContext);
  const [notebooksToStop, setNotebooksToStop] = React.useState<Notebook[]>([]);

  const onNotebooksStop = React.useCallback(
    (didStop: boolean) => {
      if (didStop) {
        // Refresh the context so the spawner page knows the full state
        requestNotebookRefresh();
        history.push(`/notebookController/spawner`);
      } else {
        setNotebooksToStop([]);
      }
    },
    [requestNotebookRefresh, history],
  );

  return (
    <>
      <ImpersonateAlert />
      <ApplicationsPage
        title="Notebook server control panel"
        description={null}
        loaded
        empty={!currentUserNotebookIsRunning}
        emptyStatePage={<Redirect to={`/notebookController/spawner`} />}
      >
        {notebook && (
          <Stack hasGutter className="odh-notebook-controller__page">
            <StackItem>
              <StopServerModal
                notebooksToStop={notebooksToStop}
                onNotebooksStop={onNotebooksStop}
              />
              <ActionList>
                <ActionListItem onClick={() => setNotebooksToStop([notebook])}>
                  <Button variant="primary">Stop notebook server</Button>
                </ActionListItem>
                <ActionListItem
                  onClick={() => {
                    if (notebook.metadata.annotations?.['opendatahub.io/link']) {
                      window.location.href = notebook.metadata.annotations['opendatahub.io/link'];
                    }
                  }}
                >
                  <Button variant="secondary">Return to server</Button>
                </ActionListItem>
              </ActionList>
            </StackItem>
            <StackItem>
              <NotebookServerDetails />
            </StackItem>
          </Stack>
        )}
      </ApplicationsPage>
    </>
  );
};

NotebookServer.displayName = 'NotebookController';

export default NotebookServer;
