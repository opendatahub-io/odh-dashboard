import * as React from 'react';
import useFetchState, { FetchState } from '~/utilities/useFetchState';
import { NotebookKind } from '~/k8sTypes';
import { getNotebooks } from '~/api';
import { POLL_INTERVAL } from '~/utilities/const';

type ProjectNotebooks = { [key: string]: NotebookKind[] | undefined };

const fetchNotebooks = (namespaces: string[]): Promise<ProjectNotebooks> =>
  new Promise((resolve) => {
    const fetchers = namespaces.map((namespace) => getNotebooks(namespace));
    Promise.all(fetchers).then((results) => {
      const projectNotebooks: ProjectNotebooks = {};
      namespaces.forEach((ns, i) => (projectNotebooks[ns] = results[i]));
      resolve(projectNotebooks);
    });
  });

export const useWatchProjectNotebooks = (
  namespaces: string[],
  refreshRate = POLL_INTERVAL,
): FetchState<ProjectNotebooks> =>
  useFetchState<ProjectNotebooks>(
    React.useCallback(() => fetchNotebooks(namespaces), [namespaces]),
    {},
    { refreshRate },
  );
