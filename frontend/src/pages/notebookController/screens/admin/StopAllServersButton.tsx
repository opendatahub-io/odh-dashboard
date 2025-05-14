import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { AdminViewUserData } from './types';
import { NotebookAdminContext } from './NotebookAdminContext';

type StopAllServersButtonProps = {
  users: AdminViewUserData[];
};

const StopAllServersButton: React.FC<StopAllServersButtonProps> = ({ users }) => {
  const activeServers = users
    .filter((user) => user.serverStatus.isNotebookRunning)
    .map((user) => user.serverStatus);
  const serverCount = activeServers.length;
  const { setServerStatuses } = React.useContext(NotebookAdminContext);

  return (
    <Button
      data-id="stop-all-servers-button"
      data-testid="stop-all-servers-button"
      variant="secondary"
      isDanger
      isDisabled={serverCount === 0}
      onClick={() => {
        setServerStatuses(activeServers);
      }}
    >
      Stop all workbenches ({serverCount})
    </Button>
  );
};

export default StopAllServersButton;
