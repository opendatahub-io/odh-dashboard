import * as React from 'react';
import { Notebook } from '../types';
import { POLL_INTERVAL } from './const';
import { getNotebook } from 'services/notebookService';
import { useSelector } from 'react-redux';
import { State } from 'redux/types';
import { generateNotebookNameFromUsername } from './notebookControllerUtils';

export const useWatchNotebook = (
  projectName: string,
): {
  notebook: Notebook | undefined;
  loaded: boolean;
  loadError: Error | undefined;
  forceUpdate: () => void;
  setPollInterval: (interval: number) => void;
} => {
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [notebook, setNotebook] = React.useState<Notebook>();
  const [pollInterval, setPollInterval] = React.useState<number>(POLL_INTERVAL);
  const username = useSelector<State, string>((state) => state.appState.user || '');

  const forceUpdate = () => {
    if (username) {
      setLoaded(false);
      const notebookName = generateNotebookNameFromUsername(username);
      getNotebook(projectName, notebookName)
        .then((data: Notebook) => {
          setLoaded(true);
          setLoadError(undefined);
          setNotebook(data);
        })
        .catch((e) => {
          setLoadError(e);
        });
    }
  };

  React.useEffect(() => {
    let watchHandle;
    const watchNotebook = (notebookName: string) => {
      getNotebook(projectName, notebookName)
        .then((data: Notebook) => {
          setLoaded(true);
          setLoadError(undefined);
          setNotebook(data);
          if (data?.status?.readyReplicas === 1) {
            setPollInterval(POLL_INTERVAL);
          }
        })
        .catch((e) => {
          setLoadError(e);
        });
      watchHandle = setTimeout(() => watchNotebook(notebookName), pollInterval);
    };
    if (username) {
      const notebookName = generateNotebookNameFromUsername(username);
      watchNotebook(notebookName);
    }

    return () => {
      if (watchHandle) {
        clearTimeout(watchHandle);
      }
    };
    // Don't update when components are updated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, pollInterval]);

  return { notebook, loaded, loadError, forceUpdate, setPollInterval };
};
