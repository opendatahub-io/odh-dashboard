import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { useUser } from '../../../../redux/selectors';
import { AdminViewUserData } from './types';
import { NotebookControllerContext } from '../../NotebookControllerContext';
import { NotebookControllerTabTypes } from '../../const';
import { NotebookAdminContext } from './NotebookAdminContext';

type ServerStatusProps = {
  data: AdminViewUserData['serverStatus'];
  username: AdminViewUserData['name'];
};

const ServerStatus: React.FC<ServerStatusProps> = ({ data, username }) => {
  const { setImpersonating, setCurrentAdminTab } = React.useContext(NotebookControllerContext);
  const { username: stateUser } = useUser();
  const forStateUser = stateUser === username;
  const { setServerStatuses } = React.useContext(NotebookAdminContext);

  if (!data.isNotebookRunning) {
    return (
      <Button
        variant="link"
        isInline
        onClick={() => {
          if (forStateUser) {
            // Starting your own server, no need to impersonate
            setCurrentAdminTab(NotebookControllerTabTypes.SERVER);
            return;
          }
          setImpersonating(
            { notebook: data.notebook, isRunning: data.isNotebookRunning },
            username,
          );
        }}
      >
        {forStateUser ? 'Start your server' : 'Start server'}
      </Button>
    );
  }

  return (
    <Button
      variant="link"
      isDanger
      isInline
      onClick={() => {
        setServerStatuses([data]);
      }}
    >
      Stop server
    </Button>
  );
};

export default ServerStatus;
