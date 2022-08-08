import * as React from 'react';
import AppContext from '../../../../app/AppContext';
import useWatchNotebooksForUsers from '../../../../utilities/useWatchNotebooksForUsers';
import { Notebook, NotebookControllerUserState } from '../../../../types';
import { User } from './types';
import useCheckUserPrivilege from './useCheckUserPrivilege';
import useNamespaces from '../../useNamespaces';

const useAdminUsers = (): [User[], boolean, Error | undefined] => {
  const { dashboardConfig } = React.useContext(AppContext);
  const { notebookNamespace } = useNamespaces();

  // Data in the notebook controller state is impure and can have duplicates and more importantly empty states; trim them
  const unstableUserStates = dashboardConfig.status?.notebookControllerState || [];
  const userStates: NotebookControllerUserState[] = Object.values(
    unstableUserStates
      .filter(({ user }) => !!user)
      .reduce<{ [key: string]: NotebookControllerUserState }>(
        (acc, state) => ({ ...acc, [state.user]: state }),
        {},
      ),
  );

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
