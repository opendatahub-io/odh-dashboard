import * as React from 'react';
import { getRoute } from '#~/api';
import useFetch, { FetchStateCallbackPromise, FetchStateObject } from '#~/utilities/useFetch';
import { K8sAPIOptions } from '#~/k8sTypes';

type NotebookRouteState = {
  route: string | null;
};

const useRouteForNotebook = (
  notebookName?: string,
  projectName?: string,
  isRunning?: boolean,
  pollInterval?: number,
): FetchStateObject<NotebookRouteState> => {
  const fetchRoute = React.useCallback<FetchStateCallbackPromise<NotebookRouteState>>(
    (opts: K8sAPIOptions): Promise<NotebookRouteState> => {
      if (!notebookName || !projectName) {
        return Promise.reject({
          route: null,
        });
      }

      return getRoute(notebookName, projectName, opts)
        .then((fetchedRoute) => ({
          route: `https://${fetchedRoute.spec.host}/notebook/${projectName}/${notebookName}`,
        }))
        .catch((e) => {
          if (!isRunning && e.statusObject?.code === 404) {
            return {
              route: null,
            };
          }
          return {
            route: null,
          };
        });
    },
    [notebookName, projectName, isRunning],
  );

  const initialState: NotebookRouteState = {
    route: null,
  };

  return useFetch<NotebookRouteState>(fetchRoute, initialState, {
    refreshRate: pollInterval,
    initialPromisePurity: true,
  });
};

export default useRouteForNotebook;
