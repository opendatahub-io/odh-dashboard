import * as React from 'react';
import { useWatchNotebook } from '../../../../utilities/useWatchNotebook';
import { FAST_POLL_INTERVAL, POLL_INTERVAL } from '../../../../utilities/const';
import { Notebook } from '../../../../types';

export const useWatchNotebookForSpawnerPage = (
  startShown: boolean,
  projectName: string,
  username: string,
): {
  notebook?: Notebook;
  notebookLoaded: boolean;
} => {
  const {
    notebook,
    loaded: notebookLoaded,
    setPollInterval: setNotebookPollInterval,
  } = useWatchNotebook(projectName, username);
  React.useEffect(() => {
    setNotebookPollInterval(startShown ? FAST_POLL_INTERVAL : POLL_INTERVAL);
  }, [startShown, setNotebookPollInterval]);
  return { notebook, notebookLoaded };
};
