import * as React from 'react';
import { useUser } from '../../redux/selectors';
import { NotebookControllerContext } from './NotebookControllerContext';

const useCurrentUser = (): string => {
  const { username: stateUsername } = useUser();
  const { currentUserState } = React.useContext(NotebookControllerContext);
  return currentUserState.user || stateUsername;
};

export default useCurrentUser;
