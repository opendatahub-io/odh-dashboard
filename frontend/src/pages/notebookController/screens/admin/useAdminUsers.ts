import * as React from 'react';
import { useUser } from '../../../../redux/selectors';
import useWatchNotebooksForUsers from '../../../../utilities/useWatchNotebooksForUsers';
import { NotebookRunningState } from '../../../../types';
import { NotebookControllerContext } from '../../NotebookControllerContext';
import useNamespaces from '../../useNamespaces';
import { AdminViewUserData } from './types';
import useCheckForAllowedUsers from './useCheckForAllowedUsers';

const useAdminUsers = (): [AdminViewUserData[], boolean, Error | undefined] => {
  const { requestNotebookRefresh } = React.useContext(NotebookControllerContext);
  const { username: loggedInUser } = useUser();

  const { notebookNamespace } = useNamespaces();
  const [allowedUsers, allowedUsersLoaded, allowedUsersError] = useCheckForAllowedUsers();

  const {
    notebooks,
    loaded: notebookLoaded,
    loadError: notebookError,
    forceRefresh,
  } = useWatchNotebooksForUsers(
    notebookNamespace,
    allowedUsers.map(({ username }) => username),
  );

  const users: AdminViewUserData[] = allowedUsers.map<AdminViewUserData>((allowedUser) => {
    const notebookRunningState: NotebookRunningState = notebooks[allowedUser.username] || null;
    const notebook = notebookRunningState?.notebook ?? null;
    const isNotebookRunning = notebookRunningState?.isRunning ?? false;

    return {
      name: allowedUser.username,
      privilege: allowedUser.privilege,
      lastActivity: allowedUser.lastActivity,
      serverStatus: {
        notebook,
        isNotebookRunning,
        forceRefresh: () => {
          forceRefresh([allowedUser.username]);
          if (allowedUser.username === loggedInUser) {
            // Refresh your own state too -- so you can live updates if you navigate or restart your server
            requestNotebookRefresh();
          }
        },
      },
    };
  });

  const isLoaded = notebookLoaded && allowedUsersLoaded;
  const loadError = notebookError || allowedUsersError;
  return [users, isLoaded, loadError];
};

export default useAdminUsers;
