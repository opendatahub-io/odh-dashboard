import * as React from 'react';
import { EventKind, NotebookKind } from '~/k8sTypes';
import { getNotebookEvents } from '~/api';
import { FAST_POLL_INTERVAL } from '~/utilities/const';

export const useWatchNotebookEvents = (
  notebook: NotebookKind,
  podUid: string,
  activeFetch: boolean,
): EventKind[] => {
  const notebookName = notebook.metadata.name;
  const { namespace } = notebook.metadata;
  const [notebookEvents, setNotebookEvents] = React.useState<EventKind[]>([]);

  // Cached events are returned when activeFetch is false.
  // This allows us to reset notebookEvents state when activeFetch becomes
  // false to prevent UI blips when activeFetch goes true again.
  const notebookEventsCache = React.useRef<EventKind[]>(notebookEvents);

  // when activeFetch switches to false, reset events state
  React.useEffect(() => {
    if (!activeFetch) {
      setNotebookEvents([]);
    }
  }, [activeFetch]);

  React.useEffect(() => {
    let watchHandle: ReturnType<typeof setTimeout>;
    let cancelled = false;

    if (activeFetch && namespace && notebookName) {
      const watchNotebookEvents = () => {
        getNotebookEvents(namespace, notebookName, podUid)
          .then((data: EventKind[]) => {
            if (!cancelled) {
              notebookEventsCache.current = data;
              setNotebookEvents(data);
            }
          })
          .catch((e) => {
            /* eslint-disable-next-line no-console */
            console.error('Error fetching notebook events', e);
          });
        watchHandle = setTimeout(watchNotebookEvents, FAST_POLL_INTERVAL);
      };

      if (!podUid) {
        // delay the initial fetch to avoid older StatefulSet event errors from blipping on screen during notebook startup
        watchHandle = setTimeout(watchNotebookEvents, Math.max(FAST_POLL_INTERVAL, 3000));
      } else {
        watchNotebookEvents();
      }
    }
    return () => {
      cancelled = true;
      clearTimeout(watchHandle);
    };
  }, [namespace, notebookName, podUid, activeFetch]);

  return activeFetch ? notebookEvents : notebookEventsCache.current;
};
