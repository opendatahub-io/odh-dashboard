import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '@odh-dashboard/internal/utilities/useFetchState';
// eslint-disable-next-line import/no-extraneous-dependencies
import { listInferenceService } from '@odh-dashboard/internal/api/index';
import { Deployment } from '../../extension-points';

export const useDeployedModels = (namespace: string): FetchState<Deployment[] | undefined> => {
  const callback = React.useCallback<FetchStateCallbackPromise<Deployment[]>>(
    async (opts) => {
      if (!namespace) {
        return Promise.reject(new NotReadyError('Namespace is required'));
      }

      const inferenceServiceList = await listInferenceService(
        namespace,
        'opendatahub.io/dashboard=true',
        opts,
      );

      return inferenceServiceList.map((inferenceService) => ({
        model: inferenceService,
      }));
    },
    [namespace],
  );

  return useFetchState(callback, undefined, {
    initialPromisePurity: true,
  });
};
