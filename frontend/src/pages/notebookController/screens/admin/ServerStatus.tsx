import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { useUser } from '../../../../redux/selectors';
import { User } from './types';
import { NotebookControllerContext } from '../../NotebookControllerContext';
import { usernameTranslate } from '../../../../utilities/notebookControllerUtils';
import { NotebookControllerTabTypes } from '../../const';
import { NotebookAdminContext } from './NotebookAdminContext';

type ServerStatusProps = {
  data: User['serverStatus'];
  username: User['name'];
};

const ServerStatus: React.FC<ServerStatusProps> = ({ data, username }) => {
  const { setImpersonatingUsername, setCurrentAdminTab } =
    React.useContext(NotebookControllerContext);
  const { username: stateUser } = useUser();
  const forStateUser = stateUser === username;
  const { setServerStatuses } = React.useContext(NotebookAdminContext);

  if (!data.notebook) {
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
          setImpersonatingUsername(usernameTranslate(username));
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
