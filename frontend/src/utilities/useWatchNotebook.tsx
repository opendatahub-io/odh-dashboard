import * as React from 'react';
import { Notebook } from '../types';
import { POLL_INTERVAL } from './const';
import { getNotebook } from 'services/notebookService';
import { generateNotebookNameFromUsername } from './notebookControllerUtils';

export const useWatchNotebook = (
  projectName: string,
  username: string,
): {
  notebook: Notebook | undefined;
  loaded: boolean;
  loadError: Error | undefined;
  setPollInterval: (interval: number) => void;
} => {
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [notebook, setNotebook] = React.useState<Notebook>();
  const [pollInterval, setPollInterval] = React.useState<number>(POLL_INTERVAL);

  React.useEffect(() => {
    let watchHandle;
    let cancelled = false;
    const watchNotebook = (notebookName: string) => {
      getNotebook(projectName, notebookName)
        .then((data: Notebook) => {
          if (cancelled) {
            return;
          }
          if (data?.status?.readyReplicas === 1) {
            setPollInterval(POLL_INTERVAL);
          }
          setNotebook(data);
          setLoaded(true);
          setLoadError(undefined);
        })
        .catch((e) => {
          if (cancelled) {
            return;
          }
          setLoadError(e);
        });
      watchHandle = setTimeout(() => watchNotebook(notebookName), pollInterval);
    };
    if (username) {
      const notebookName = generateNotebookNameFromUsername(username);
      watchNotebook(notebookName);
    }

    return () => {
      cancelled = true;
      if (watchHandle) {
        clearTimeout(watchHandle);
      }
    };
  }, [username, pollInterval, projectName]);

  return { notebook, loaded, loadError, setPollInterval };
};
