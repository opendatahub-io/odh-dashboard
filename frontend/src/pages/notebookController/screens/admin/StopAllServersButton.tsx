import * as React from 'react';
import { Button } from '@patternfly/react-core';
import StopServerModal from '#~/pages/notebookController/screens/server/StopServerModal';
import { Notebook } from '#~/types';
import { useStopWorkbenchModal } from '#~/concepts/notebooks/useStopWorkbenchModal';
import useRouteForNotebook from '#~/pages/projects/notebook/useRouteForNotebook.ts';
import { AdminViewUserData } from './types';

type StopAllServersButtonProps = {
  users: AdminViewUserData[];
};

const StopAllServersButton: React.FC<StopAllServersButtonProps> = ({ users }) => {
  const activeServers = users
    .filter((user) => user.serverStatus.isNotebookRunning)
    .map((user) => user.serverStatus);

  const serverCount = activeServers.length;

  const notebooksToStop = activeServers
    .map((server) => server.notebook)
    .filter((notebook): notebook is Notebook => !!notebook);

  // if there is only one notebook to stop
  const [routeLink, loaded, loadError] = useRouteForNotebook(
    notebooksToStop[0]?.metadata.name,
    notebooksToStop[0]?.metadata.namespace,
  );

  const { showModal, isDeleting, onStop, onNotebooksStop } = useStopWorkbenchModal({
    notebooksToStop,
    refresh: () => {
      activeServers.forEach((server) => {
        server.forceRefresh();
      });
    },
  });

  return (
    <>
      <Button
        data-testid="stop-all-servers-button"
        variant="secondary"
        isDanger
        isDisabled={serverCount === 0}
        onClick={() => {
          onStop();
        }}
      >
        Stop all workbenches ({serverCount})
      </Button>
      {showModal && loaded ? (
        <StopServerModal
          notebooksToStop={notebooksToStop}
          link={loadError || !routeLink ? '#' : routeLink}
          isDeleting={isDeleting}
          onNotebooksStop={onNotebooksStop}
        />
      ) : null}
    </>
  );
};

export default StopAllServersButton;
