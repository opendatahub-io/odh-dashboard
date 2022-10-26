import * as React from 'react';
import { FAST_POLL_INTERVAL } from '../../../utilities/const';
import { NotebookState } from './types';

const useRefreshNotebookUntilStart = (
  notebookState: NotebookState,
  doListen: boolean,
): ((listen: boolean) => void) => {
  const [watchingForNotebook, setWatchingForNotebook] = React.useState(false);
  const lastNotebookState = React.useRef<NotebookState>(notebookState);
  lastNotebookState.current = notebookState;

  React.useEffect(() => {
    let interval;
    if (watchingForNotebook && doListen) {
      interval = setInterval(() => {
        const { isRunning, refresh } = lastNotebookState.current;
        if (!isRunning) {
          refresh().catch((e) => {
            console.error('Error refreshing, stopping notebook refresh', e);
            setWatchingForNotebook(false);
          });
        } else {
          setWatchingForNotebook(false);
        }
      }, FAST_POLL_INTERVAL);
    }

    return () => {
      clearInterval(interval);
    };
  }, [watchingForNotebook, doListen]);

  return React.useCallback((listen: boolean) => {
    setWatchingForNotebook(listen);
  }, []);
};

export default useRefreshNotebookUntilStart;
