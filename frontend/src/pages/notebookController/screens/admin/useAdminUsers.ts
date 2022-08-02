import * as React from 'react';
import AppContext from '../../../../app/AppContext';
import useWatchNotebooksForUsers from '../../../../utilities/useWatchNotebooksForUsers';
import { Notebook } from '../../../../types';
import { User } from './types';
import useCheckUserPrivilege from './useCheckUserPrivilege';
import useNamespaces from '../../useNamespaces';

const useAdminUsers = (): [User[], boolean, Error | undefined] => {
  const { dashboardConfig } = React.useContext(AppContext);
  const { notebookNamespace } = useNamespaces();

  const userStates = dashboardConfig.status?.notebookControllerState || [];
  const usernames = userStates.map(({ user }) => user);

  const [privileges, privilegesLoaded, privilegesLoadError] = useCheckUserPrivilege(usernames);
  const {
    notebooks,
    loaded: notebookLoaded,
    loadError: notebookError,
    forceRefresh,
  } = useWatchNotebooksForUsers(notebookNamespace, usernames);

  const users: User[] = userStates.map<User>((state) => {
    const notebook: Notebook = notebooks[state.user];
    return {
      name: state.user,
      privilege: privileges[state.user],
      lastActivity: state.lastActivity,
      serverStatus: {
        notebook,
        forceRefresh: () => forceRefresh([state.user]),
      },
    };
  });

  return [users, notebookLoaded && privilegesLoaded, notebookError || privilegesLoadError];
};

export default useAdminUsers;
