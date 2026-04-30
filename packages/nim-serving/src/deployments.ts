import React from 'react';
import type { K8sAPIOptions, ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { type NIMDeployment, type NIMServiceKind } from './types';
import {
  useWatchNIMServices,
  useWatchInferenceServices,
  useWatchNIMDeploymentPods,
} from './api/watch';
import { getNIMDeploymentStatus } from './deploymentStatus';
import { getNIMDeploymentEndpoints } from './deploymentEndpoints';
import { NIM_ID } from '../extensions';

export type { NIMDeployment };

export const useWatchDeployments = (
  project: ProjectKind,
  labelSelectors?: Record<string, string>,
  filterFn?: (nimService: NIMServiceKind) => boolean,
  opts?: K8sAPIOptions,
): [NIMDeployment[] | undefined, boolean, Error[] | undefined] => {
  const [nimServices, nimServicesLoaded, nimServicesError] = useWatchNIMServices(
    project,
    labelSelectors,
    opts,
  );

  const [inferenceServices, inferenceServicesLoaded, inferenceServicesError] =
    useWatchInferenceServices(project, opts);

  const [deploymentPods, deploymentPodsLoaded, deploymentPodsError] = useWatchNIMDeploymentPods(
    project,
    opts,
  );

  const filteredNIMServices = React.useMemo(
    () => (filterFn ? nimServices.filter(filterFn) : nimServices),
    [nimServices, filterFn],
  );

  const deployments: NIMDeployment[] = React.useMemo(
    () =>
      filteredNIMServices.map((nimService) => {
        const associatedIS = inferenceServices.find((is) =>
          is.metadata.ownerReferences?.some(
            (ref) =>
              ref.kind === 'NIMService' &&
              ref.apiVersion.startsWith('apps.nvidia.com/') &&
              ref.name === nimService.metadata.name,
          ),
        );

        return {
          modelServingPlatformId: NIM_ID,
          model: nimService,
          server: associatedIS,
          status: getNIMDeploymentStatus(associatedIS, deploymentPods),
          endpoints: getNIMDeploymentEndpoints(associatedIS),
          apiProtocol: 'REST',
        };
      }),
    [filteredNIMServices, inferenceServices, deploymentPods],
  );

  const effectivelyLoaded = Boolean(
    (nimServicesLoaded || nimServicesError) &&
      (inferenceServicesLoaded || inferenceServicesError) &&
      (deploymentPodsLoaded || deploymentPodsError),
  );

  const errors = React.useMemo(
    () =>
      [nimServicesError, inferenceServicesError, deploymentPodsError].filter(
        (error): error is Error => Boolean(error),
      ),
    [nimServicesError, inferenceServicesError, deploymentPodsError],
  );

  return [deployments, effectivelyLoaded, errors];
};
