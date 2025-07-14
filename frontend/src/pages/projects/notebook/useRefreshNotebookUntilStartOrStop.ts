import * as React from 'react';
import { FAST_POLL_INTERVAL } from '#~/utilities/const';
import { NotebookState } from './types';

const useRefreshNotebookUntilStartOrStop = (
  notebookState: NotebookState,
  doListen: boolean,
): ((listen: boolean, stop?: boolean) => void) => {
  const [watchingForNotebook, setWatchingForNotebook] = React.useState(false);
  const [watchingForStop, setWatchingForStop] = React.useState(false);
  const lastNotebookState = React.useRef<NotebookState>(notebookState);
  lastNotebookState.current = notebookState;

  React.useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (watchingForNotebook && doListen) {
      interval = setInterval(() => {
        const { isRunning, isStopped, refresh } = lastNotebookState.current;
        const condition = watchingForStop ? isStopped : isRunning;
        if (!condition) {
          refresh().catch((e) => {
            /* eslint-disable-next-line no-console */
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
  }, [watchingForStop, watchingForNotebook, doListen]);

  /**
   * The second parameter allows listening for the notebook to be stopped. Default is to wait until started.
   */
  return React.useCallback((listen: boolean, waitForStop = false) => {
    setWatchingForStop(waitForStop);
    setWatchingForNotebook(listen);
  }, []);
};

export default useRefreshNotebookUntilStartOrStop;
