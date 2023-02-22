import * as React from 'react';
import { K8sAPIOptions } from '../../k8sTypes';

/** Unify a single result type */
type Result<T> = T | null;

export type FetchState<T> = [
  data: Result<T>,
  loaded: boolean,
  loadError: Error | undefined,
  refresh: () => void,
];

export type FetchStateCallbackPromise<T> = (opts?: K8sAPIOptions) => Promise<Result<T>>;

const useFetchState = <T>(
  /** useCallback result */
  fetchCallbackPromise: FetchStateCallbackPromise<T>,
  /** To enable auto refresh */
  refreshRate = 0,
): FetchState<T> => {
  const [result, setResult] = React.useState<Result<T>>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | undefined>(undefined);
  const abortRef = React.useRef<() => void>(() => undefined);

  const call = React.useCallback<() => () => void>(() => {
    let interval: ReturnType<typeof setInterval>;
    let alreadyAborted = false;
    const abortController = new AbortController();

    const doRequest = () => {
      fetchCallbackPromise({ signal: abortController.signal })
        .then((r) => {
          setLoadError(undefined);
          setResult(r);
          setLoaded(true);
        })
        .catch((e) => {
          if (e.name == 'AbortError') {
            // Abort errors are silent
            return;
          }
          setLoadError(e);
        });
    };

    doRequest();
    if (refreshRate > 0) {
      interval = setInterval(doRequest, refreshRate);
    }

    return () => {
      if (alreadyAborted) {
        return;
      }

      alreadyAborted = true;
      clearInterval(interval);
      abortController.abort();
    };
  }, [fetchCallbackPromise, refreshRate]);

  React.useEffect(() => {
    abortRef.current = call();
    return () => {
      abortRef.current();
    };
  }, [call]);

  const refresh = React.useCallback(() => {
    abortRef.current();
    abortRef.current = call();
  }, [call]);

  return [result, loaded, loadError, refresh];
};

export default useFetchState;
