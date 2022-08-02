import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { User } from './types';
import { deleteNotebook } from '../../../../services/notebookService';
import useNamespaces from '../../useNamespaces';

type StopAllServersButtonProps = {
  users: User[];
};

const stopServers = async (projectName: string, serverList: User['serverStatus'][]) => {
  const notebookNames: string[] = serverList
    .map((serverStatus) => serverStatus.notebook?.metadata.name || '')
    .filter((notebookName) => !!notebookName);

  return Promise.all(
    notebookNames.map((notebookName) => {
      return deleteNotebook(projectName, notebookName);
    }),
  );
};

const StopAllServersButton: React.FC<StopAllServersButtonProps> = ({ users }) => {
  const { notebookNamespace } = useNamespaces();
  const activeNotebooks = users
    .filter((user) => user.serverStatus.notebook)
    .map((user) => user.serverStatus);
  const serverCount = activeNotebooks.length;
  const [isDeleting, setIsDeleting] = React.useState(false);

  return (
    <Button
      variant="secondary"
      isDanger
      isDisabled={serverCount === 0 || isDeleting}
      onClick={() => {
        setIsDeleting(true);
        stopServers(notebookNamespace, activeNotebooks)
          .then(() => {
            setIsDeleting(false);
          })
          .catch(() => {
            setIsDeleting(false);
          });
      }}
    >
      Stop all servers ({serverCount})
    </Button>
  );
};

export default StopAllServersButton;
