import * as React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button, ActionList, ActionListItem, Stack, StackItem } from '@patternfly/react-core';
import { Notebook } from '#~/types';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { NotebookControllerContext } from '#~/pages/notebookController/NotebookControllerContext';
import ImpersonateAlert from '#~/pages/notebookController/screens/admin/ImpersonateAlert';
import useNotification from '#~/utilities/useNotification';
import { stopWorkbenches } from '#~/pages/notebookController/utils';
import { useUser } from '#~/redux/selectors';
import useStopNotebookModalAvailability from '#~/pages/projects/notebook/useStopNotebookModalAvailability';
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
  const [notebooksToStop, setNotebooksToStop] = React.useState<Notebook[]>([]);
  const [dontShowModalValue] = useStopNotebookModalAvailability();
  const [showModal, setShowModal] = React.useState(!dontShowModalValue);
  const { isAdmin } = useUser();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const onNotebooksStop = React.useCallback(
    (didStop: boolean) => {
      if (didStop) {
        // Refresh the context so the spawner page knows the full state
        requestNotebookRefresh();
        navigate(`/notebookController/spawner`);
      } else {
        setShowModal(false);
        setNotebooksToStop([]);
      }
    },
    [requestNotebookRefresh, navigate],
  );

  const handleStopWorkbenches = React.useCallback(
    (workbenches: Notebook[]) => {
      setIsDeleting(true);
      stopWorkbenches(workbenches, isAdmin)
        .then(() => {
          setIsDeleting(false);
          onNotebooksStop(true);
          setShowModal(false);
        })
        .catch((e) => {
          setIsDeleting(false);
          notification.error(
            `Error stopping workbench${workbenches.length > 1 ? 's' : ''}`,
            e.message,
          );
        });
    },
    [isAdmin, notification, onNotebooksStop],
  );

  const link = currentUserNotebookLink || '#';

  const onStop = React.useCallback(
    (notebooks: Notebook[]) => {
      if (dontShowModalValue) {
        handleStopWorkbenches(notebooks);
      } else {
        setNotebooksToStop(notebooks);
        setShowModal(true);
      }
    },
    [dontShowModalValue, handleStopWorkbenches],
  );

  return (
    <>
      <ImpersonateAlert />
      <ApplicationsPage
        title="Workbench control panel"
        description={null}
        loaded
        provideChildrenPadding
        empty={!currentUserNotebookIsRunning}
        emptyStatePage={<Navigate to="/notebookController/spawner" />}
      >
        {notebook && (
          <Stack hasGutter>
            <StackItem>
              {showModal && (
                <StopServerModal
                  notebooksToStop={notebooksToStop}
                  isDeleting={isDeleting}
                  handleStopSingleWorkbench={handleStopWorkbenches}
                  link={link}
                  onNotebooksStop={onNotebooksStop}
                />
              )}
              <ActionList>
                <ActionListItem
                  onClick={(e) => {
                    if (link === '#') {
                      e.preventDefault();
                      notification.error(
                        'Error accessing workbench',
                        'Failed to redirect page due to missing workbench URL, please try to refresh the page and try it again.',
                      );
                    }
                  }}
                >
                  <Button component="a" href={link} data-id="return-nb-button">
                    Access workbench
                  </Button>
                </ActionListItem>
                <ActionListItem
                  onClick={() => {
                    onStop([notebook]);
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
