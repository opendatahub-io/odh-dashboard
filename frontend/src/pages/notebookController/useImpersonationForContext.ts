import * as React from 'react';
import { Notebook } from '#~/types';
import { useUser } from '#~/redux/selectors';
import { NotebookContextStorage, SetNotebookState } from './notebookControllerContextTypes';

export type SetImpersonating = (
  impersonateNotebookState?: { notebook: Notebook | null; isRunning: boolean },
  impersonateUsername?: string,
) => void;

const useImpersonationForContext = (
  setNotebookState: SetNotebookState,
): [impersonatedUsername: string | null, setImpersating: SetImpersonating] => {
  const [impersonatedUsername, setImpersonatedUsername] = React.useState<string | null>(null);
  const { isAdmin } = useUser();

  const setImpersonating = React.useCallback<SetImpersonating>(
    (impersonateNotebookState, newImpersonatingUsername) => {
      if (!isAdmin) {
        return;
      } // cannot impersonate as a non-admin
      // if (currentUserNotebook === undefined) return; // we are in a loading state -- don't allow

      if (newImpersonatingUsername && impersonateNotebookState) {
        // Impersonating as admin
        if (impersonatedUsername) {
          // Already impersonating, current state does not matter
          setNotebookState((prevState) => ({
            ...prevState,
            current: impersonateNotebookState.notebook,
            currentIsRunning: impersonateNotebookState.isRunning,
          }));
          return;
        }

        // Starting impersonation, keep current state for when we reset
        setNotebookState((prevState) => {
          const currentState: NotebookContextStorage['former'] = {
            current: prevState.current,
            currentIsRunning: prevState.currentIsRunning,
            currentPodUID: prevState.currentPodUID,
            currentLink: prevState.currentLink,
            requestRefresh: prevState.requestRefresh,
          };
          return {
            ...prevState,
            current: impersonateNotebookState.notebook,
            currentIsRunning: impersonateNotebookState.isRunning,
            former: currentState,
          };
        });
        setImpersonatedUsername(newImpersonatingUsername);
        return;
      }

      // Undo impersonation
      setNotebookState((prevState) => ({
        ...prevState,
        ...prevState.former,
        former: null,
      }));
      setImpersonatedUsername(null);
    },
    [isAdmin, setNotebookState, impersonatedUsername],
  );

  return [impersonatedUsername, setImpersonating];
};

export default useImpersonationForContext;
