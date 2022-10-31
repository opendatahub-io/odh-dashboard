import * as React from 'react';
import { EventKind } from '../../../k8sTypes';
import { getNotebookEvents } from '../../../api';
import { FAST_POLL_INTERVAL } from '../../../utilities/const';

export const useWatchNotebookEvents = (
  projectName: string,
  podUid: string,
  activeFetch: boolean,
): EventKind[] => {
  const [notebookEvents, setNoteBookEvents] = React.useState<EventKind[]>([]);

  React.useEffect(() => {
    let watchHandle;
    let cancelled = false;

    const clear = () => {
      cancelled = true;
      clearTimeout(watchHandle);
    };

    if (activeFetch) {
      const watchNotebookEvents = () => {
        if (projectName && podUid) {
          getNotebookEvents(projectName, podUid)
            .then((data: EventKind[]) => {
              if (cancelled) {
                return;
              }
              setNoteBookEvents(data);
            })
            .catch((e) => {
              console.error('Error fetching notebook events', e);
              clear();
            });
          watchHandle = setTimeout(watchNotebookEvents, FAST_POLL_INTERVAL);
        }
      };

      watchNotebookEvents();
    }
    return clear;
  }, [projectName, podUid, activeFetch]);

  return notebookEvents;
};
