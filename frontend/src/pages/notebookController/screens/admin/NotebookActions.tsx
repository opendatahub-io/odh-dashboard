import * as React from 'react';
import { ActionsColumn, IAction } from '@patternfly/react-table';
import StopServerModal from '~/pages/notebookController/screens/server/StopServerModal';
import { StopAdminWorkbenchModalProps } from '~/pages/projects/screens/detail/notebooks/types';
import { AdminViewUserData } from './types';

type ServerStatusProps = {
  data: AdminViewUserData['actions'];
  stopAdminWorkbenchModalProps: StopAdminWorkbenchModalProps;
};

const NotebookActions: React.FC<ServerStatusProps> = ({ data, stopAdminWorkbenchModalProps }) => {
  const { showModal, onStop, ...modalProps } = stopAdminWorkbenchModalProps;

  if (!data.isNotebookRunning) {
    return null;
  }

  const rowActions: IAction[] = [
    {
      title: 'Stop workbench',
      onClick: () => {
        onStop([data]);
      },
    },
  ];

  return (
    <>
      <ActionsColumn items={rowActions} />
      {showModal && <StopServerModal {...modalProps} />}
    </>
  );
};

export default NotebookActions;
