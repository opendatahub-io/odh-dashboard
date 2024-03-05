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
  currentUserNotebookLink: '',
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
  const [
    { current, currentIsRunning, currentPodUID, requestRefresh, currentLink },
    setNotebookState,
  ] = React.useState<NotebookContextStorage>({
    current: undefined,
    currentIsRunning: false,
    currentPodUID: '',
    currentLink: '',
    former: null,
    requestRefresh: () => undefined,
  });
  const [impersonatedUsername, setImpersonating] = useImpersonationForContext(setNotebookState);
  const [currentTab, setCurrentAdminTab] = useAdminTabState();

  const contextValue = React.useMemo(
    () => ({
      impersonatedUsername,
      setImpersonating,
      currentTab,
      setCurrentAdminTab,
      requestNotebookRefresh: requestRefresh,
      // Don't return undefined -- that's for the loading
      currentUserNotebook: current ?? null,
      currentUserNotebookIsRunning: currentIsRunning,
      currentUserNotebookPodUID: currentPodUID,
      currentUserNotebookLink: currentLink,
    }),
    [
      impersonatedUsername,
      setImpersonating,
      currentTab,
      setCurrentAdminTab,
      current,
      currentIsRunning,
      currentPodUID,
      requestRefresh,
      currentLink,
    ],
  );
  return (
    <NotebookControllerContext.Provider value={contextValue}>
      <SetupCurrentNotebook currentNotebook={current} setNotebookState={setNotebookState}>
        {children}
      </SetupCurrentNotebook>
    </NotebookControllerContext.Provider>
  );
};
