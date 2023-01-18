import * as React from 'react';
import { NotebookControllerTabTypes } from './const';
import SetupCurrentNotebook from './SetupCurrentNotebook';
import useImpersonationForContext from './useImpersonationForContext';
import {
  NotebookContextStorage,
  NotebookControllerContextProps,
} from './notebookControllerContextTypes';
import useAdminTabState from './useAdminTabState';

const defaultNotebookControllerContext: NotebookControllerContextProps = {
  currentUserNotebook: null,
  requestNotebookRefresh: () => undefined,
  currentUserNotebookIsRunning: false,
  currentUserNotebookPodUID: '',
  setImpersonating: () => undefined,
  impersonatedUsername: null,
  setCurrentAdminTab: () => undefined,
  currentTab: NotebookControllerTabTypes.SERVER,
};

export const NotebookControllerContext = React.createContext(defaultNotebookControllerContext);

type NotebookControllerContextProviderProps = {
  children: React.ReactNode;
};

export const NotebookControllerContextProvider: React.FC<
  NotebookControllerContextProviderProps
> = ({ children }) => {
  const [notebookState, setNotebookState] = React.useState<NotebookContextStorage>({
    current: undefined,
    currentIsRunning: false,
    currentPodUID: '',
    former: null,
    requestRefresh: () => undefined,
  });
  const [impersonatedUsername, setImpersonating] = useImpersonationForContext(setNotebookState);
  const [currentTab, setCurrentAdminTab] = useAdminTabState();

  return (
    <NotebookControllerContext.Provider
      value={{
        impersonatedUsername,
        setImpersonating,
        currentTab,
        setCurrentAdminTab,
        requestNotebookRefresh: notebookState.requestRefresh,
        // Don't return undefined -- that's for the loading
        currentUserNotebook: notebookState.current ?? null,
        currentUserNotebookIsRunning: notebookState.currentIsRunning,
        currentUserNotebookPodUID: notebookState.currentPodUID,
      }}
    >
      <SetupCurrentNotebook
        currentNotebook={notebookState.current}
        setNotebookState={setNotebookState}
      >
        {children}
      </SetupCurrentNotebook>
    </NotebookControllerContext.Provider>
  );
};
