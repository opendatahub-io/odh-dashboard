import * as React from 'react';
import { NotebookList, StatefulSetList } from '../types';
import { getNotebooks } from '../services/notebookService';
import { useDispatch } from 'react-redux';
import { addNotification } from '../redux/actions/actions';
import { getStatefulSets } from '../services/statefulSetsService';

export const useGetNotebooks = (
  projectName: string,
): {
  notebookList: NotebookList | undefined;
  statefulSetList: StatefulSetList | undefined;
  watchNotebookStatus: () => { start: () => void; stop: () => void };
  loadNotebooks: () => void;
} => {
  const dispatch = useDispatch();
  const [notebookList, setNotebookList] = React.useState<NotebookList>();
  const [statefulSetList, setStatefulSetList] = React.useState<StatefulSetList>();
  const isWatchingNotebooks = React.useRef(false); // avoid multiple watchers
  const cancelled = React.useRef(false);

  React.useEffect(() => {
    watchNotebookStatus().start();
    return () => {
      cancelled.current = true;
      watchNotebookStatus().stop();
    };
  }, [projectName]);

  const loadNotebooks = async () => {
    const nbPromise = getNotebooks(projectName);
    const ssPromise = getStatefulSets(projectName);
    try {
      setNotebookList(await nbPromise);
      setStatefulSetList(await ssPromise);
    } catch (e) {
      dispatch(
        addNotification({
          status: 'danger',
          title: `Load notebooks error.`,
          message: e.message,
          timestamp: new Date(),
        }),
      );
    }
  };

  const watchNotebookStatus = () => {
    let watchHandle;
    const start = () => {
      const watchNotebooks = async () => {
        if (!cancelled.current) {
          isWatchingNotebooks.current = true;
          const nbPromise = getNotebooks(projectName);
          const ssPromise = getStatefulSets(projectName);
          try {
            setNotebookList(await nbPromise);
            setStatefulSetList(await ssPromise);
            watchHandle = setTimeout(watchNotebooks, 5000);
          } catch (e) {
            dispatch(
              addNotification({
                status: 'danger',
                title: `Load notebooks error.`,
                message: e.message,
                timestamp: new Date(),
              }),
            );
          }
        }
      };
      if (!isWatchingNotebooks.current) {
        watchNotebooks();
      }
    };
    const stop = () => {
      if (watchHandle) {
        clearTimeout(watchHandle);
      }
    };
    return { start, stop };
  };

  return { notebookList, statefulSetList, watchNotebookStatus, loadNotebooks };
};
