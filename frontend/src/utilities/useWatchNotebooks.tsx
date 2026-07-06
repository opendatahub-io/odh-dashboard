import * as React from 'react';
import useFetchState, { FetchState } from '#~/utilities/useFetchState';
import { NotebookKind } from '#~/k8sTypes';
import { getNotebooks } from '#~/api';
import { POLL_INTERVAL } from '#~/utilities/const';

export const useWatchNotebooks = (
  namespace: string,
  refreshRate = POLL_INTERVAL,
): FetchState<NotebookKind[]> =>
  useFetchState<NotebookKind[]>(
    React.useCallback(() => getNotebooks(namespace), [namespace]),
    [],
    { refreshRate },
  );
