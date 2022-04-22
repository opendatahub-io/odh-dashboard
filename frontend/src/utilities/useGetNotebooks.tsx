import * as React from 'react';
import * as _ from 'lodash';
import { NotebookList } from '../types';
import { getDataProjectNotebooks } from '../services/dataProjectsService';
import { useDispatch } from 'react-redux';
import { addNotification } from '../redux/actions/actions';

export const useGetNotebooks = (
  projectName: string,
): {
  notebookList: NotebookList | undefined;
  watchNotebookStatus: () => { start: () => void; stop: () => void };
  loadNotebooks: () => void;
} => {
  const dispatch = useDispatch();
  const [notebookList, setNotebookList] = React.useState<NotebookList>();
  const isWatchingNotebooks = React.useRef(false); // avoid multiple watchers
  const cancelled = React.useRef(false);

  React.useEffect(() => {
    watchNotebookStatus().start();
    return () => {
      cancelled.current = true;
      watchNotebookStatus().stop();
    };
  }, [projectName]);

  const loadNotebooks = () => {
    getDataProjectNotebooks(projectName)
      .then((nbks: NotebookList) => {
        setNotebookList(nbks);
      })
      .catch((e) => {
        dispatch(
          addNotification({
            status: 'danger',
            title: `Load notebooks error.`,
            message: e.message,
            timestamp: new Date(),
          }),
        );
      });
  };

  const watchNotebookStatus = () => {
    let watchHandle;
    const start = () => {
      const watchNotebooks = () => {
        if (!cancelled.current) {
          isWatchingNotebooks.current = true;
          getDataProjectNotebooks(projectName)
            .then(async (newNotebookList: NotebookList) => {
              // const newNotebooks = newNotebookList.items;
              // const needWatch = newNotebooks.filter(notebook => getContainerStatus(notebook) !== 'Running' && getContainerStatus(notebook) !== 'Stopped').length !== 0;
              // if(!_.isEqual(newNotebooks, notebooks)) {
              setNotebookList(newNotebookList);
              // }
              // if (needWatch) {
              watchHandle = setTimeout(watchNotebooks, 5000);
              // } else {
              //   isWatchingNotebooks.current = false;
              // }
            })
            .catch((e) => {
              dispatch(
                addNotification({
                  status: 'danger',
                  title: `Load notebooks error.`,
                  message: e.message,
                  timestamp: new Date(),
                }),
              );
            });
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

  return { notebookList, watchNotebookStatus, loadNotebooks };
};
