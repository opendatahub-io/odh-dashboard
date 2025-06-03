import * as React from 'react';
import { ActionsColumn, IAction } from '@patternfly/react-table';
import StopServerModal from '#~/pages/notebookController/screens/server/StopServerModal';
import { useStopWorkbenchModal } from '#~/concepts/notebooks/useStopWorkbenchModal';
import { AdminViewUserData } from './types';

type ServerStatusProps = {
  data: AdminViewUserData['actions'];
};

const NotebookActions: React.FC<ServerStatusProps> = ({ data }) => {
  const notebooksToStop = data.notebook ? [data.notebook] : [];

  const { showModal, isDeleting, onStop, onNotebooksStop } = useStopWorkbenchModal({
    notebooksToStop,
    refresh: () => {
      data.forceRefresh();
    },
  });

  if (!data.isNotebookRunning) {
    return null;
  }

  const rowActions: IAction[] = [
    {
      title: 'Stop workbench',
      onClick: () => {
        onStop();
      },
    },
  ];

  return (
    <>
      <ActionsColumn items={rowActions} />
      {showModal && (
        <StopServerModal
          notebooksToStop={notebooksToStop}
          link="#"
          isDeleting={isDeleting}
          onNotebooksStop={onNotebooksStop}
        />
      )}
    </>
  );
};

export default NotebookActions;
