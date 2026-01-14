import * as React from 'react';
import { listRoutes } from '#~/api';
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

      return listRoutes(projectName, `notebook-name=${notebookName}`, opts)
        .then((fetchedRoutes) => {
          return fetchedRoutes.length > 0
            ? `https://${fetchedRoutes[0].spec.host}/notebook/${projectName}/${notebookName}`
            : null;
        })
        .catch((e) => {
          if (!isRunning && e.statusObject?.code === 404) {
            return null;
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
