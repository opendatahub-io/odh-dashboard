import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import useFetchState, {
  FetchState,
  FetchStateCallbackPromise,
  NotReadyError,
} from '@odh-dashboard/internal/utilities/useFetchState';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { ModelServingPlatform } from './modelServingPlatforms';
import { Deployment } from '../../extension-points';

export const useDeployedModels = (
  project: ProjectKind,
  modelServingPlatform?: ModelServingPlatform | null,
): FetchState<Deployment[] | undefined> => {
  const callback = React.useCallback<FetchStateCallbackPromise<Deployment[]>>(
    async (opts) => {
      if (!project.metadata.name) {
        return Promise.reject(new NotReadyError('Project is required'));
      }

      if (!modelServingPlatform) {
        return Promise.reject(new NotReadyError('Model serving platform is required'));
      }

      const deployments = await modelServingPlatform.properties.deployments.list(project, opts);

      return deployments;
    },
    [modelServingPlatform, project],
  );

  return useFetchState(callback, undefined, {
    initialPromisePurity: true,
  });
};
