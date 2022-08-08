import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { User } from './types';
import { NotebookAdminContext } from './NotebookAdminContext';

type StopAllServersButtonProps = {
  users: User[];
};

const StopAllServersButton: React.FC<StopAllServersButtonProps> = ({ users }) => {
  const activeServers = users
    .filter((user) => user.serverStatus.notebook)
    .map((user) => user.serverStatus);
  const serverCount = activeServers.length;
  const { setServerStatuses } = React.useContext(NotebookAdminContext);

  return (
    <Button
      variant="secondary"
      isDanger
      isDisabled={serverCount === 0}
      onClick={() => {
        setServerStatuses(activeServers);
      }}
    >
      Stop all servers ({serverCount})
    </Button>
  );
};

export default StopAllServersButton;
