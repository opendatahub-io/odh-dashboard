import React from 'react';
import {
  NotReadyError,
  POLL_INTERVAL,
  useFetchState,
  type APIOptions,
  type FetchState,
  type FetchStateCallbackPromise,
} from 'mod-arch-core';
import { listExternalModels } from '~/app/api/external-models';
import { ExternalModel } from '~/app/types/external-models';

export const useListExternalModels = (namespace: string): FetchState<ExternalModel[]> => {
  const callback = React.useCallback<FetchStateCallbackPromise<ExternalModel[]>>(
    (opts: APIOptions) => {
      if (!namespace) {
        return Promise.reject(new NotReadyError('Namespace not yet available'));
      }
      return listExternalModels()(opts, namespace);
    },
    [namespace],
  );

  return useFetchState<ExternalModel[]>(callback, [], { refreshRate: POLL_INTERVAL });
};
