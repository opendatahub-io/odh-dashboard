import * as React from 'react';
import { Button } from '@patternfly/react-core';
import StopServerModal from '~/pages/notebookController/screens/server/StopServerModal';
import { StopAdminWorkbenchModalProps } from '~/pages/projects/screens/detail/notebooks/types';
import { AdminViewUserData } from './types';

type StopAllServersButtonProps = {
  users: AdminViewUserData[];
  stopAdminWorkbenchModalProps: StopAdminWorkbenchModalProps;
};

const StopAllServersButton: React.FC<StopAllServersButtonProps> = ({
  users,
  stopAdminWorkbenchModalProps,
}) => {
  const activeServers = users
    .filter((user) => user.serverStatus.isNotebookRunning)
    .map((user) => user.serverStatus);
  const serverCount = activeServers.length;
  const { showModal, onStop, ...modalProps } = stopAdminWorkbenchModalProps;

  return (
    <>
      <Button
        data-id="stop-all-servers-button"
        data-testid="stop-all-servers-button"
        variant="secondary"
        isDanger
        isDisabled={serverCount === 0}
        onClick={() => {
          onStop(activeServers);
        }}
      >
        Stop all workbenches ({serverCount})
      </Button>
      {showModal && <StopServerModal {...modalProps} />}
    </>
  );
};

export default StopAllServersButton;
