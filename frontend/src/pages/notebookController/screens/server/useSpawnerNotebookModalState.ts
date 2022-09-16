import * as React from 'react';
import { useHistory } from 'react-router-dom';
import { NotebookControllerContext } from '../../NotebookControllerContext';
import { FAST_POLL_INTERVAL } from '../../../../utilities/const';
import { NotebookControllerContextProps } from '../../notebookControllerContextTypes';
import { stopNotebook } from '../../../../services/notebookService';
import useNamespaces from '../../useNamespaces';

const useRefreshNotebookAndCleanup = (startShown: boolean) => {
  const { requestNotebookRefresh } = React.useContext(NotebookControllerContext);

  const methodRef =
    React.useRef<NotebookControllerContextProps['requestNotebookRefresh']>(requestNotebookRefresh);
  methodRef.current = requestNotebookRefresh; // we don't care about the ref, we just want the last one

  React.useEffect(() => {
    if (startShown) {
      // Start modal is open, we are relying on events now, dial back the Notebook requests back to normal
      methodRef.current();
    }
  }, [startShown]);

  return React.useCallback(() => {
    // We are about to spawn, get notebook more frequently in case it was slow updating
    methodRef.current(FAST_POLL_INTERVAL);
  }, []);
};

const useSpawnerNotebookModalState = (
  createInProgress: boolean,
): {
  startShown: boolean;
  hideStartShown: () => void;
  refreshNotebookForStart: () => void;
} => {
  const { currentUserNotebook: notebook, currentUserNotebookIsRunning: isNotebookRunning } =
    React.useContext(NotebookControllerContext);
  const { notebookNamespace } = useNamespaces();
  const history = useHistory();
  const [startShown, setStartShown] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (notebook) {
      if (!isNotebookRunning) {
        // If we are in the middle of spawning a notebook
        const notStopped = !notebook.metadata.annotations?.['kubeflow-resource-stopped'];
        if (notStopped) {
          // Not stopped means we are spawning (as it is not running)
          if (!createInProgress) {
            // We are not creating, make sure the Notebook is stopped
            stopNotebook(notebookNamespace, notebook.metadata.name).catch(() => {
              console.error('Failed to stop notebook on refresh');
            });
          } else {
            setStartShown(true);
          }
        } else {
          // Stopped, no need for a modal (if it is open)
          setStartShown(false);
        }
      } else if (!startShown) {
        // We are running -- but we want to make sure we only redirect if the modal is not open
        // Last moments of spawning a notebook & before we send them to JL
        history.replace('/notebookController');
      }
    }
  }, [notebook, history, startShown, isNotebookRunning, createInProgress, notebookNamespace]);

  const refreshNotebookForStart = useRefreshNotebookAndCleanup(startShown);
  const hideStartShown = React.useCallback(() => setStartShown(false), []);

  return { startShown, hideStartShown, refreshNotebookForStart };
};

export default useSpawnerNotebookModalState;
