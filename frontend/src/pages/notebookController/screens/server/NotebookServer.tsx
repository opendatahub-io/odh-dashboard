import * as React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button, ActionList, ActionListItem, Stack, StackItem } from '@patternfly/react-core';
import { Notebook } from '~/types';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { NotebookControllerContext } from '~/pages/notebookController/NotebookControllerContext';
import ImpersonateAlert from '~/pages/notebookController/screens/admin/ImpersonateAlert';
import useNotification from '~/utilities/useNotification';
import NotebookServerDetails from './NotebookServerDetails';
import StopServerModal from './StopServerModal';

import '~/pages/notebookController/NotebookController.scss';

const NotebookServer: React.FC = () => {
  const navigate = useNavigate();
  const notification = useNotification();
  const {
    currentUserNotebook: notebook,
    currentUserNotebookIsRunning,
    currentUserNotebookLink,
    requestNotebookRefresh,
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

  const link = currentUserNotebookLink || '#';

  return (
    <>
      <ImpersonateAlert />
      <ApplicationsPage
        title="Notebook server control panel"
        description={null}
        loaded
        provideChildrenPadding
        empty={!currentUserNotebookIsRunning}
        emptyStatePage={<Navigate to="/notebookController/spawner" />}
      >
        {notebook && (
          <Stack hasGutter>
            <StackItem>
              {notebooksToStop.length ? (
                <StopServerModal
                  notebooksToStop={notebooksToStop}
                  onNotebooksStop={onNotebooksStop}
                />
              ) : null}
              <ActionList>
                <ActionListItem
                  onClick={(e) => {
                    if (link === '#') {
                      e.preventDefault();
                      notification.error(
                        'Error accessing notebook server',
                        'Failed to redirect page due to missing notebook URL, please try to refresh the page and try it again.',
                      );
                    }
                  }}
                >
                  <Button component="a" href={link} data-id="return-nb-button">
                    Access notebook server
                  </Button>
                </ActionListItem>
                <ActionListItem onClick={() => setNotebooksToStop([notebook])}>
                  <Button data-id="stop-nb-button" data-testid="stop-nb-button" variant="secondary">
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
