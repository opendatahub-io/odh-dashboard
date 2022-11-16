import * as React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button, ActionList, ActionListItem, Stack, StackItem } from '@patternfly/react-core';
import { Notebook } from '../../../../types';
import ApplicationsPage from '../../../ApplicationsPage';
import { NotebookControllerContext } from '../../NotebookControllerContext';
import ImpersonateAlert from '../admin/ImpersonateAlert';
import NotebookServerDetails from './NotebookServerDetails';
import StopServerModal from './StopServerModal';
import useNotification from '../../../../utilities/useNotification';

import '../../NotebookController.scss';

export const NotebookServer: React.FC = () => {
  const navigate = useNavigate();
  const notification = useNotification();
  const {
    currentUserNotebook: notebook,
    currentUserNotebookIsRunning,
    requestNotebookRefresh,
    impersonatedUsername,
  } = React.useContext(NotebookControllerContext);
  const [notebooksToStop, setNotebooksToStop] = React.useState<Notebook[]>([]);

  const onNotebooksStop = React.useCallback(
    (didStop: boolean) => {
      if (didStop) {
        // Refresh the context so the spawner page knows the full state
        requestNotebookRefresh();
        navigate(`/notebookController/spawner`);
      } else {
        setNotebooksToStop([]);
      }
    },
    [requestNotebookRefresh, navigate],
  );

  return (
    <>
      <ImpersonateAlert />
      <ApplicationsPage
        title="Notebook server control panel"
        description={null}
        loaded
        empty={!currentUserNotebookIsRunning}
        emptyStatePage={<Navigate to={`/notebookController/spawner`} />}
      >
        {notebook && (
          <Stack hasGutter className="odh-notebook-controller__page">
            <StackItem>
              <StopServerModal
                impersonatedUsername={impersonatedUsername ? impersonatedUsername : undefined}
                notebooksToStop={notebooksToStop}
                onNotebooksStop={onNotebooksStop}
              />
              <ActionList>
                <ActionListItem
                  onClick={() => {
                    if (notebook.metadata.annotations?.['opendatahub.io/link']) {
                      window.location.href = notebook.metadata.annotations['opendatahub.io/link'];
                    } else {
                      notification.error(
                        'Error accessing notebook server',
                        'Failed to redirect page due to missing notebook URL, please try to refresh the page and try it again.',
                      );
                    }
                  }}
                >
                  <Button data-id="return-nb-button" variant="primary">
                    Access notebook server
                  </Button>
                </ActionListItem>
                <ActionListItem onClick={() => setNotebooksToStop([notebook])}>
                  <Button data-id="stop-nb-button" variant="secondary">
                    Stop notebook server
                  </Button>
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

export default NotebookServer;
