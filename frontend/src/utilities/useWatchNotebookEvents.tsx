import * as React from 'react';
import { getNotebookEvents } from '../services/notebookEventsService';
import useNotification from './useNotification';
import { K8sEvent } from '../types';

export const useWatchNotebookEvents = (
  projectName: string,
  notebookName: string,
  watch: boolean,
): K8sEvent[] => {
  const [notebookEvents, setNoteBookEvents] = React.useState<K8sEvent[]>([]);
  const notification = useNotification();

  React.useEffect(() => {
    let watchHandle;
    let cancelled = false;

    const clear = () => {
      cancelled = true;
      if (watchHandle) {
        clearTimeout(watchHandle);
      }
    };

    const watchNotebookEvents = () => {
      if (projectName && notebookName && watch) {
        getNotebookEvents(projectName, notebookName)
          .then((data: K8sEvent[]) => {
            if (cancelled) {
              return;
            }
            setNoteBookEvents(data);
          })
          .catch((e) => {
            notification.error('Error fetching notebook events', e.response.data.message);
            clear();
          });
        watchHandle = setTimeout(watchNotebookEvents, 1000);
      }
    };

    watchNotebookEvents();
    return clear;
  }, [projectName, notebookName, notification, watch]);

  return notebookEvents;
};
