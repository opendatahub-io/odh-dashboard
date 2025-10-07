import * as React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button, ActionList, ActionListItem, Stack, StackItem } from '@patternfly/react-core';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { NotebookControllerContext } from '#~/pages/notebookController/NotebookControllerContext';
import ImpersonateAlert from '#~/pages/notebookController/screens/admin/ImpersonateAlert';
import useNotification from '#~/utilities/useNotification';
import { useStopWorkbenchModal } from '#~/concepts/notebooks/useStopWorkbenchModal';
import NotebookServerDetails from './NotebookServerDetails';
import StopServerModal from './StopServerModal';

import '#~/pages/notebookController/NotebookController.scss';

const NotebookServer: React.FC = () => {
  const navigate = useNavigate();
  const notification = useNotification();
  const {
    currentUserNotebook: notebook,
    currentUserNotebookIsRunning,
    currentUserNotebookLink,
    requestNotebookRefresh,
  } = React.useContext(NotebookControllerContext);
  const notebooksToStop = notebook ? [notebook] : [];

  const { showModal, isDeleting, onStop, onNotebooksStop } = useStopWorkbenchModal({
    notebooksToStop,
    refresh: () => {
      requestNotebookRefresh();
      navigate(`/notebook-controller/spawner`);
    },
  });

  return (
    <>
      <ImpersonateAlert />
      <ApplicationsPage
        title="Workbench control panel"
        description={null}
        loaded
        provideChildrenPadding
        empty={!currentUserNotebookIsRunning}
        emptyStatePage={<Navigate to="/notebook-controller/spawner" />}
      >
        {notebook && (
          <Stack hasGutter>
            <StackItem>
              {showModal && (
                <StopServerModal
                  notebooksToStop={notebooksToStop}
                  isDeleting={isDeleting}
                  link={currentUserNotebookLink}
                  onNotebooksStop={onNotebooksStop}
                />
              )}
              <ActionList>
                <ActionListItem
                  onClick={(e) => {
                    if (!currentUserNotebookLink) {
                      e.preventDefault();
                      notification.error(
                        'Error accessing workbench',
                        'Failed to redirect page due to missing workbench URL, please try to refresh the page and try it again.',
                      );
                    }
                  }}
                >
                  <Button component="a" href={currentUserNotebookLink} data-id="return-nb-button">
                    Access workbench
                  </Button>
                </ActionListItem>
                <ActionListItem
                  onClick={() => {
                    onStop();
                  }}
                >
                  <Button data-testid="stop-wb-button" variant="secondary">
                    Stop workbench
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
