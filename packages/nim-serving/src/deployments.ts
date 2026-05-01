import React from 'react';
import type {
  K8sAPIOptions,
  ProjectKind,
  InferenceServiceKind,
} from '@odh-dashboard/internal/k8sTypes';
import { getKServeDeploymentEndpoints } from '@odh-dashboard/kserve/deploymentEndpoints';
import { type NIMDeployment, type NIMServiceKind } from './types';
import {
  useWatchNIMServices,
  useWatchInferenceServices,
  useWatchNIMDeploymentPods,
} from './api/watch';
import { getNIMDeploymentStatus } from './deploymentStatus';
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

  const inferenceServiceByNIMName = React.useMemo(() => {
    const byName = new Map<string, InferenceServiceKind>();
    inferenceServices.forEach((is) => {
      is.metadata.ownerReferences?.forEach((ref) => {
        if (ref.kind === 'NIMService' && ref.apiVersion.startsWith('apps.nvidia.com/')) {
          byName.set(ref.name, is);
        }
      });
    });
    return byName;
  }, [inferenceServices]);

  const deployments: NIMDeployment[] = React.useMemo(
    () =>
      filteredNIMServices.map((nimService) => {
        const associatedIS = inferenceServiceByNIMName.get(nimService.metadata.name);

        return {
          modelServingPlatformId: NIM_ID,
          model: nimService,
          server: associatedIS,
          status: getNIMDeploymentStatus(associatedIS, deploymentPods),
          endpoints: associatedIS ? getKServeDeploymentEndpoints(associatedIS) : [],
          apiProtocol: 'REST',
        };
      }),
    [filteredNIMServices, inferenceServiceByNIMName, deploymentPods],
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
