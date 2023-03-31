import * as React from 'react';
import { K8sAPIOptions } from '~/k8sTypes';

/**
 * Allows "I'm not ready" rejections if you lack a lazy provided prop
 * e.g. Promise.reject(new NotReadyError('Do not have namespace'))
 */
export class NotReadyError extends Error {
  constructor(reason: string) {
    super(`Not ready yet. ${reason}`);
    this.name = 'NotReadyError';
  }
}

/** Provided as a promise, so you can await a refresh before enabling buttons / closing modals */
export type FetchStateRefreshPromise = () => Promise<void>;

/** Return state */
export type FetchState<Type, Default extends Type = Type> = [
  data: Type | Default,
  loaded: boolean,
  loadError: Error | undefined,
  refresh: FetchStateRefreshPromise,
];

type SetStateLazy<Type> = (lastState: Type) => Type;
export type AdHocUpdate<Type> = (updateLater: (updater: SetStateLazy<Type>) => void) => void;

/**
 * All callbacks will receive a K8sAPIOptions, which includes a signal to provide to a RequestInit.
 * This will allow the call to be cancelled if the hook needs to unload. It is recommended that you
 * upgrade your API handlers to support this.
 */
type FetchStateCallbackPromiseReturn<Return> = (opts: K8sAPIOptions) => Return;

/**
 * Standard usage. Your callback should return a Promise that resolves to your data.
 */
export type FetchStateCallbackPromise<Type> = FetchStateCallbackPromiseReturn<Promise<Type>>;

/**
 * Advanced usage. If you have a need to include a lazy refresh state to your data, you can use this
 * functionality. It works on the lazy React.setState functionality.
 *
 * Note: When using, you're giving up immediate setState, so you'll want to call the setStateLater
 * function immediately to get back that functionality.
 *
 * Example:
 * ```
 * React.useCallback(() =>
 *   new Promise(() => {
 *     MyAPICall().then((...) =>
 *       resolve((setStateLater) => { // << providing a function instead of the value
 *         setStateLater({ ...someInitialData })
 *         // ...some time later, after more calls / in a callback / etc
 *         setStateLater((lastState) => ({ ...lastState, data: additionalData }))
 *       })
 *     )
 *   })
 * );
 * ```
 */
export type FetchStateCallbackPromiseAdHoc<Type> = FetchStateCallbackPromiseReturn<
  Promise<AdHocUpdate<Type>>
>;

/**
 * A boilerplate helper utility. Given a callback that returns a promise, it will store state and
 * handle refreshes on intervals as needed.
 *
 * Note: Your callback *should* support the opts property so the call can be cancelled.
 */
const useFetchState = <Type, Default extends Type = Type>(
  /** React.useCallback result. */
  fetchCallbackPromise: FetchStateCallbackPromise<Type> | FetchStateCallbackPromiseAdHoc<Type>,
  /** A preferred default states - this is ignored after the first render */
  defaultState: Default,
  /** To enable auto refresh */
  refreshRate = 0,
): FetchState<Type, Default> => {
  const [result, setResult] = React.useState<Type | Default>(defaultState);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | undefined>(undefined);
  const abortCallbackRef = React.useRef<() => void>(() => undefined);

  const call = React.useCallback<() => [Promise<void>, () => void]>(() => {
    let interval: ReturnType<typeof setInterval>;
    let alreadyAborted = false;
    const abortController = new AbortController();

    const doRequest = () =>
      fetchCallbackPromise({ signal: abortController.signal })
        .then((r) => {
          if (alreadyAborted) {
            return;
          }

          setLoadError(undefined);
          if (typeof r === 'function') {
            r((setState: SetStateLazy<Type>) => {
              if (alreadyAborted) {
                return;
              }

              setResult(setState);
              setLoaded(true);
            });
          } else {
            setResult(r);
            setLoaded(true);
          }
        })
        .catch((e) => {
          if (alreadyAborted) {
            return;
          }

          if (e.name === 'NotReadyError') {
            // An escape hatch for callers to reject the call at this fetchCallbackPromise reference
            // Re-compute your callback to re-trigger again
            return;
          }
          if (e.name == 'AbortError') {
            // Abort errors are silent
            return;
          }
          setLoadError(e);
        });

    if (refreshRate > 0) {
      interval = setInterval(doRequest, refreshRate);
    }

    const unload = () => {
      if (alreadyAborted) {
        return;
      }

      alreadyAborted = true;
      clearInterval(interval);
      abortController.abort();
    };

    return [doRequest(), unload];
  }, [fetchCallbackPromise, refreshRate]);

  React.useEffect(() => {
    const [, unload] = call();
    abortCallbackRef.current = unload;
    return () => {
      abortCallbackRef.current();
    };
  }, [call]);

  const refresh = React.useCallback<FetchStateRefreshPromise>(() => {
    abortCallbackRef.current();
    const [callPromise, unload] = call();
    abortCallbackRef.current = unload;
    return callPromise;
  }, [call]);

  return [result, loaded, loadError, refresh];
};

export default useFetchState;
