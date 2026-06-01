import React from 'react';
import type { K8sAPIOptions, ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { getKServeDeploymentEndpoints } from '@odh-dashboard/kserve/deploymentEndpoints';
import { useWatchInferenceServices, useWatchNIMDeploymentPods } from './watch';
import { getNIMDeploymentStatus } from './status';
import { type NIMDeployment, type NIMServiceKind } from '../nimservices/types';
import { isNIMOwned } from '../nimservices/utils';
import { useWatchNIMServices } from '../nimservices/watch';
import { NIM_ID } from '../../../extensions';

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

  const nimOwnedInferenceServices = React.useMemo(
    () => inferenceServices.filter(isNIMOwned),
    [inferenceServices],
  );

  const deployments: NIMDeployment[] = React.useMemo(
    () =>
      filteredNIMServices.map((nimService) => {
        const associatedIS = nimOwnedInferenceServices.find((is) =>
          is.metadata.ownerReferences?.some((ref) => ref.name === nimService.metadata.name),
        );

        return {
          modelServingPlatformId: NIM_ID,
          model: nimService,
          server: associatedIS,
          status: getNIMDeploymentStatus(associatedIS, deploymentPods, nimService.metadata.name),
          endpoints: associatedIS ? getKServeDeploymentEndpoints(associatedIS) : [],
          apiProtocol: 'REST',
        };
      }),
    [filteredNIMServices, nimOwnedInferenceServices, deploymentPods],
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

  return React.useMemo(
    () => [deployments, effectivelyLoaded, errors],
    [deployments, effectivelyLoaded, errors],
  );
};
