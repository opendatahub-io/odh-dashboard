import * as React from 'react';
import { getNotebookEvents } from '~/services/notebookEventsService';
import { K8sEvent, Notebook } from '~/types';
import useNotification from './useNotification';
import { FAST_POLL_INTERVAL } from './const';

export const useWatchNotebookEvents = (
  notebook: Notebook | null,
  podUid: string,
  activeFetch: boolean,
): K8sEvent[] => {
  const notebookName = notebook?.metadata.name;
  const namespace = notebook?.metadata.namespace;
  const [notebookEvents, setNotebookEvents] = React.useState<K8sEvent[]>([]);
  const notification = useNotification();

  // Cached events are returned when activeFetch is false.
  // This allows us to reset notebookEvents state when activeFetch becomes
  // false to prevent UI blips when activeFetch goes true again.
  const notebookEventsCache = React.useRef<K8sEvent[]>(notebookEvents);

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
          .then((data: K8sEvent[]) => {
            if (!cancelled) {
              notebookEventsCache.current = data;
              setNotebookEvents(data);
            }
          })
          .catch((e) => {
            notification.error('Error fetching notebook events', e.response.data.message);
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
  }, [namespace, notebookName, podUid, activeFetch, notification]);

  return activeFetch ? notebookEvents : notebookEventsCache.current;
};
