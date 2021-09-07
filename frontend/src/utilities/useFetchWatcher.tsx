import * as React from 'react';
import * as _ from 'lodash';
import { POLL_INTERVAL } from './const';

export type WatchFetchResults<T> = {
  results: T | null;
  loaded: boolean;
  loadError?: Error;
};

export function useFetchWatcher<T>(fetchFunction: () => Promise<T>): WatchFetchResults<T> {
  const [results, setResults] = React.useState<WatchFetchResults<T>>({
    results: null,
    loaded: false,
  });
  const prevResults = React.useRef<WatchFetchResults<T>>();

  React.useEffect(() => {
    let watchHandle;
    const watchResults = () => {
      let newResults;
      fetchFunction()
        .then((results: T) => {
          newResults = { loaded: true, results };
        })
        .catch((e) => {
          newResults = { loaded: true, results: null, loadError: e };
        })
        .finally(() => {
          if (!_.isEqual(newResults, prevResults.current)) {
            setResults(newResults);
            prevResults.current = newResults;
          }
        });
      watchHandle = setTimeout(watchResults, POLL_INTERVAL);
    };
    watchResults();

    return () => {
      if (watchHandle) {
        clearTimeout(watchHandle);
      }
    };
  }, [fetchFunction]);

  return results;
}
