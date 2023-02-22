import * as React from 'react';
import { getNotebookEvents } from '../services/notebookEventsService';
import useNotification from './useNotification';
import { K8sEvent } from '../types';
import { FAST_POLL_INTERVAL } from './const';

export const useWatchNotebookEvents = (
  projectName: string,
  podUID: string,
  activeFetch: boolean,
): K8sEvent[] => {
  const [notebookEvents, setNoteBookEvents] = React.useState<K8sEvent[]>([]);
  const notification = useNotification();

  React.useEffect(() => {
    let watchHandle;
    let cancelled = false;

    const clear = () => {
      cancelled = true;
      clearTimeout(watchHandle);
    };

    if (activeFetch) {
      const watchNotebookEvents = () => {
        if (projectName && podUID) {
          getNotebookEvents(projectName, podUID)
            .then((data: K8sEvent[]) => {
              if (cancelled) {
                return;
              }
              setNoteBookEvents(data);
            })
            .catch((e) => {
              notification.error('Error fetching notebook events', e.response.data.message);
              clear();
            })
            .finally(() => {
              watchHandle = setTimeout(watchNotebookEvents, FAST_POLL_INTERVAL);
            });
        }
      };
      watchNotebookEvents();
    }
    return clear;
  }, [projectName, podUID, notification, activeFetch]);

  return notebookEvents;
};
