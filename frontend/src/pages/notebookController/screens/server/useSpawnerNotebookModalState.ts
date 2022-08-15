import * as React from 'react';
import { useHistory } from 'react-router-dom';
import { NotebookControllerContext } from '../../NotebookControllerContext';

const useSpawnerNotebookModalState = (): [
  startShown: boolean,
  setStartShown: (newState: boolean) => void,
] => {
  const { currentUserNotebook: notebook, currentUserNotebookIsRunning: isNotebookRunning } =
    React.useContext(NotebookControllerContext);
  const history = useHistory();
  const [startShown, setStartShown] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (notebook) {
      if (!isNotebookRunning) {
        // If we are in the middle of spawning a notebook
        const notStopped = !notebook.metadata.annotations?.['kubeflow-resource-stopped'];
        if (notStopped) {
          // Not stopped means we are spawning (as it is not running)
          setStartShown(true);
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
  }, [notebook, history, startShown, isNotebookRunning]);

  return [startShown, setStartShown];
};

export default useSpawnerNotebookModalState;
