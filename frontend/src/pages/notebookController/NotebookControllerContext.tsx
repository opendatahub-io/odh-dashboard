import * as React from 'react';
import { NotebookControllerUserState } from '../../types';
import { EMPTY_USER_STATE, NotebookControllerTabTypes } from './const';
import { useGetUserStateFromDashboardConfig } from '../../utilities/notebookControllerUtils';
import { useUser } from '../../redux/selectors';

type NotebookControllerContextProps = {
  setCurrentUserState: (userState: NotebookControllerUserState) => void;
  currentUserState: NotebookControllerUserState;
  setImpersonatingUsername: (translatedUsername: string | null) => void;
  impersonatingUser: boolean;
  setCurrentAdminTab: (newTab: NotebookControllerTabTypes) => void;
  currentTab: NotebookControllerTabTypes;
};

const defaultNotebookControllerContext: NotebookControllerContextProps = {
  setCurrentUserState: () => undefined,
  currentUserState: EMPTY_USER_STATE,
  setImpersonatingUsername: () => undefined,
  impersonatingUser: false,
  setCurrentAdminTab: () => undefined,
  currentTab: NotebookControllerTabTypes.SERVER,
};

export const NotebookControllerContext = React.createContext(defaultNotebookControllerContext);

export const NotebookControllerContextProvider: React.FC = ({ children }) => {
  const [currentUserState, setCurrentUserState] =
    React.useState<NotebookControllerUserState>(EMPTY_USER_STATE);
  const [oldUserState, setOldUserState] =
    React.useState<NotebookControllerUserState>(EMPTY_USER_STATE);
  const [impersonatingUser, setImpersonatingUser] = React.useState<boolean>(false);
  const [currentTab, setCurrentTab] = React.useState(NotebookControllerTabTypes.SERVER);
  const { isAdmin } = useUser();

  const getNewStateFromUser = useGetUserStateFromDashboardConfig();

  const setImpersonatingUsername = React.useCallback<
    NotebookControllerContextProps['setImpersonatingUsername']
  >(
    (impersonateUsername) => {
      if (!isAdmin) return; // cannot impersonate as a non-admin

      if (impersonateUsername) {
        // Impersonating as admin
        let newState = getNewStateFromUser(impersonateUsername);
        if (!newState) {
          newState = { ...EMPTY_USER_STATE, user: impersonateUsername };
        }

        if (impersonatingUser) {
          // Already impersonating, drop current state
          setCurrentUserState(newState);
          return;
        }

        // Starting impersonation, keep current state for when we reset
        setOldUserState(currentUserState);
        setCurrentUserState(newState);
        setImpersonatingUser(true);
        return;
      }

      // Undo impersonation, bring back old state
      setImpersonatingUser(false);
      if (oldUserState !== EMPTY_USER_STATE) {
        // We have an old user state, reset
        setCurrentUserState(oldUserState);
        setOldUserState(EMPTY_USER_STATE);
        return;
      }
    },
    [isAdmin, oldUserState, getNewStateFromUser, impersonatingUser, currentUserState],
  );

  const setCurrentAdminTab = React.useCallback(
    (newTab: NotebookControllerTabTypes) => {
      if (!isAdmin) return; // cannot change tab as a non-admin

      setCurrentTab(newTab);
    },
    [isAdmin],
  );

  return (
    <NotebookControllerContext.Provider
      value={{
        setCurrentUserState,
        currentUserState,
        impersonatingUser,
        setImpersonatingUsername,
        currentTab,
        setCurrentAdminTab,
      }}
    >
      {children}
    </NotebookControllerContext.Provider>
  );
};
