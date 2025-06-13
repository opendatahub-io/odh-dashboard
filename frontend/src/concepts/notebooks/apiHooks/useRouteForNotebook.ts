import * as React from 'react';
import { getRoute } from '#~/api';
import useFetch, { FetchStateCallbackPromise } from '#~/utilities/useFetch';
import { K8sAPIOptions } from '#~/k8sTypes';

type NotebookRouteState = {
  route: string | null;
  error: Error | null;
  loaded: boolean;
};

const useRouteForNotebook = (
  notebookName?: string,
  projectName?: string,
  isRunning?: boolean,
  pollInterval?: number,
): [routeLink: string | null, loaded: boolean, loadError: Error | null] => {
  const fetchRoute = React.useCallback<FetchStateCallbackPromise<NotebookRouteState>>(
    (opts: K8sAPIOptions): Promise<NotebookRouteState> => {
      if (!notebookName || !projectName) {
        return Promise.reject({
          route: null,
          error: new Error('Notebook name and project name must be provided'),
          loaded: false,
        });
      }

      return getRoute(notebookName, projectName, opts)
        .then((fetchedRoute) => ({
          route: `https://${fetchedRoute.spec.host}/notebook/${projectName}/${notebookName}`,
          error: null,
          loaded: true,
        }))
        .catch((e) => {
          if (!isRunning && e.statusObject?.code === 404) {
            return {
              route: null,
              error: null,
              loaded: false,
            };
          }
          return {
            route: null,
            error: e,
            loaded: false,
          };
        });
    },
    [notebookName, projectName, isRunning],
  );

  const initialState: NotebookRouteState = {
    route: null,
    error: null,
    loaded: false,
  };

  const { data, error } = useFetch<NotebookRouteState>(fetchRoute, initialState, {
    refreshRate: pollInterval,
    initialPromisePurity: true,
  });

  return [data.route, data.loaded, data.error || error || null];
};

export default useRouteForNotebook;
