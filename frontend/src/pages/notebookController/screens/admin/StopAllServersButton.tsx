import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { User } from './types';
import { deleteNotebook } from '../../../../services/notebookService';
import useNamespaces from '../../useNamespaces';
import { allSettledPromises } from '../../../../utilities/allSettledPromises';
import { Notebook } from '../../../../types';

type StopAllServersButtonProps = {
  users: User[];
};

const stopServers = async (
  projectName: string,
  serverList: User['serverStatus'][],
): Promise<void> => {
  return allSettledPromises<Notebook | void>(
    serverList.map((serverStatus) => {
      const notebookName = serverStatus.notebook?.metadata.name || '';
      if (!notebookName) return Promise.resolve();
      return deleteNotebook(projectName, notebookName);
    }),
  ).then(() => {
    serverList.forEach((serverStatus) => {
      serverStatus.forceRefresh();
    });
  });
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
