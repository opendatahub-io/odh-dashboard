import * as React from 'react';
import useFetchState, { FetchState, NotReadyError } from '~/utilities/useFetchState';
import { NotebookKind } from '~/k8sTypes';
import { POLL_INTERVAL } from '~/utilities/const';
import { getNotebooksStates } from '~/pages/projects/notebook/useProjectNotebookStates';
import { NotebookState } from './types';

export const useNotebooksStates = (
  notebooks: NotebookKind[],
  checkStatus = true,
): FetchState<NotebookState[]> => {
  const fetchNotebooksStatus = React.useCallback(() => {
    if (!checkStatus) {
      return Promise.reject(new NotReadyError('Not running'));
    }
    return getNotebooksStates(notebooks);
  }, [notebooks, checkStatus]);

  return useFetchState<NotebookState[]>(fetchNotebooksStatus, [], {
    refreshRate: POLL_INTERVAL,
  });
};
