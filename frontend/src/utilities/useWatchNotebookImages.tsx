import * as React from 'react';
// import { useSelector } from 'react-redux';
// import { State } from '../redux/types';
import { fetchNotebooks } from '../services/notebookImageService';
import { Notebook } from '../types';
import { POLL_INTERVAL } from './const';
//import { useDeepCompareMemoize } from './useDeepCompareMemoize';

export const useWatchNotebookImages = (): {
  notebooks: Notebook[];
  loaded: boolean;
  loadError: Error | undefined;
  forceUpdate: () => void;
} => {
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<Error>();
  const [notebooks, setNotebooks] = React.useState<Notebook[]>([]);
  const forceUpdate = () => {
    setLoaded(false);
    fetchNotebooks()
      .then((data: Notebook[]) => {
        setLoaded(true);
        setLoadError(undefined);
        setNotebooks(data);
      })
      .catch((e) => {
        setLoadError(e);
      });
  };

  React.useEffect(() => {
    let watchHandle;
    const watchNotebooks = () => {
      fetchNotebooks()
        .then((data: Notebook[]) => {
          setLoaded(true);
          setLoadError(undefined);
          setNotebooks(data);
        })
        .catch((e) => {
          setLoadError(e);
        });
      watchHandle = setTimeout(watchNotebooks, POLL_INTERVAL);
    };
    watchNotebooks();

    return () => {
      if (watchHandle) {
        clearTimeout(watchHandle);
      }
    };
    // Don't update when components are updated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { notebooks: notebooks || [], loaded, loadError, forceUpdate };
};
