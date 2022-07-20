import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { useDashboardNamespace } from '../../../../redux/selectors';
import { deleteNotebook } from '../../../../services/notebookService';
import { User } from './types';
import { NotebookControllerContext } from '../../NotebookControllerContext';
import { usernameTranslate } from '../../../../utilities/notebookControllerUtils';
import useNotification from '../../../../utilities/useNotification';

type ServerStatusProps = {
  data: User['serverStatus'];
  username: User['name'];
};

const ServerStatus: React.FC<ServerStatusProps> = ({ data, username }) => {
  const { dashboardNamespace } = useDashboardNamespace(); // TODO: notebook namespace
  const notification = useNotification();
  const { setImpersonatingUsername } = React.useContext(NotebookControllerContext);

  if (!data.notebook) {
    return (
      <Button
        variant="link"
        isInline
        onClick={() => {
          setImpersonatingUsername(usernameTranslate(username));
        }}
      >
        Start server
      </Button>
    );
  }

  return (
    <Button
      variant="link"
      isDanger
      isInline
      onClick={() => {
        const notebookName = data.notebook?.metadata.name;
        if (notebookName) {
          deleteNotebook(dashboardNamespace, notebookName)
            .then(() => data.forceRefresh())
            .catch((e) => {
              notification.error(`Error delete notebook ${notebookName}`, e.message);
            });
        }
      }}
    >
      Stop server
    </Button>
  );
};

export default ServerStatus;
