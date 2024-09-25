import * as React from 'react';
import useFetchState, { FetchState } from '~/utilities/useFetchState';
import { NotebookKind } from '~/k8sTypes';
import { POLL_INTERVAL } from '~/utilities/const';
import { getNotebooksStates } from '~/pages/projects/notebook/useProjectNotebookStates';
import { NotebookState } from './types';

export const useNotebooksStates = (
  notebooks: NotebookKind[],
  namespace: string,
): FetchState<NotebookState[]> => {
  const fetchNotebooksStatus = React.useCallback(
    () => getNotebooksStates(notebooks, namespace),
    [namespace, notebooks],
  );

  return useFetchState<NotebookState[]>(fetchNotebooksStatus, [], {
    refreshRate: POLL_INTERVAL,
  });
};
