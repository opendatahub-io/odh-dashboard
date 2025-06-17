import * as React from 'react';
import { getRoute } from '#~/api';
import useFetch, { FetchStateCallbackPromise, FetchStateObject } from '#~/utilities/useFetch';
import { K8sAPIOptions } from '#~/k8sTypes';

const useRouteForNotebook = (
  notebookName?: string,
  projectName?: string,
  isRunning?: boolean,
  pollInterval?: number,
): FetchStateObject<string | null> => {
  const fetchRoute = React.useCallback<FetchStateCallbackPromise<string | null>>(
    (opts: K8sAPIOptions): Promise<string | null> => {
      if (!notebookName || !projectName) {
        return Promise.reject('Notebook name or project name is not provided');
      }

      return getRoute(notebookName, projectName, opts)
        .then(
          (fetchedRoute) =>
            `https://${fetchedRoute.spec.host}/notebook/${projectName}/${notebookName}`,
        )
        .catch((e) => {
          if (!isRunning && e.statusObject?.code === 404) {
            return Promise.reject(e);
          }
          return Promise.reject(e);
        });
    },
    [notebookName, projectName, isRunning],
  );

  return useFetch<string | null>(fetchRoute, null, {
    refreshRate: pollInterval,
    initialPromisePurity: true,
  });
};

export default useRouteForNotebook;
