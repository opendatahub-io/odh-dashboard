import * as React from 'react';
import AppContext from '../../../../app/AppContext';
import { useDashboardNamespace } from '../../../../redux/selectors';
import useWatchNotebooksForUsers from '../../../../utilities/useWatchNotebooksForUsers';
import { Notebook } from '../../../../types';
import { User } from './types';

const useAdminUsers = (): [User[], boolean, Error | undefined] => {
  const { dashboardConfig } = React.useContext(AppContext);
  const { dashboardNamespace } = useDashboardNamespace(); // TODO: needs to use the notebook namespace

  const userStates = dashboardConfig.status?.notebookControllerState || [];
  const usernames = userStates.map(({ user }) => user);

  const {
    notebooks,
    loaded: notebookLoaded,
    loadError: notebookError,
    forceRefresh,
  } = useWatchNotebooksForUsers(dashboardNamespace, usernames);

  const users: User[] = userStates.map<User>((state) => {
    const notebook: Notebook = notebooks[state.user];
    return {
      name: state.user,
      lastActivity: state.lastActivity,
      serverStatus: {
        notebook,
        forceRefresh: () => forceRefresh([state.user]),
      },
    };
  });

  return [users, notebookLoaded, notebookError];
};

export default useAdminUsers;
