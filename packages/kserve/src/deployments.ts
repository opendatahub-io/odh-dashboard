import React from 'react';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { K8sAPIOptions } from '@odh-dashboard/k8s-core';
import {
  type InferenceServiceKind,
  type ServingRuntimeKind,
  getAPIProtocolFromServingRuntime,
} from '@odh-dashboard/model-serving/shared';
import {
  Deployment,
  isModelServingExcludeDeployment,
} from '@odh-dashboard/model-serving/extension-points';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import {
  deleteInferenceService,
  deleteServingRuntime,
  getInferenceService,
  getInferenceServicePods,
} from '@odh-dashboard/internal/api/index';
import { getKServeDeploymentEndpoints } from './deploymentEndpoints';
import {
  useWatchDeploymentPods,
  useWatchServingRuntimes,
  useWatchInferenceServices,
} from './api/watch';
import { getKServeDeploymentStatus } from './deploymentStatus';
import { KSERVE_ID } from '../extensions';

export type KServeDeployment = Deployment<InferenceServiceKind, ServingRuntimeKind>;
export const isKServeDeployment = (deployment: Deployment): deployment is KServeDeployment =>
  deployment.modelServingPlatformId === KSERVE_ID;

export const useWatchDeployments = (
  project: ProjectKind,
  labelSelectors?: { [key: string]: string },
  filterFn?: (inferenceService: InferenceServiceKind) => boolean,
  opts?: K8sAPIOptions,
): [KServeDeployment[] | undefined, boolean, Error[] | undefined] => {
  const [inferenceServices, inferenceServiceLoaded, inferenceServiceError] =
    useWatchInferenceServices(project, labelSelectors, opts);
  const [servingRuntimes, servingRuntimeLoaded, servingRuntimeError] = useWatchServingRuntimes(
    project,
    opts,
  );
  const [deploymentPods, deploymentPodsLoaded, deploymentPodsError] = useWatchDeploymentPods(
    project,
    opts,
  );

  const [exclusionExtensions, exclusionsResolved] = useResolvedExtensions(
    isModelServingExcludeDeployment,
  );

  const kserveExclusions = React.useMemo(
    () => exclusionExtensions.filter((ext) => ext.properties.excludeFromPlatform === KSERVE_ID),
    [exclusionExtensions],
  );

  const filteredInferenceServices = React.useMemo(() => {
    let services = inferenceServices;

    if (kserveExclusions.length > 0) {
      services = services.filter(
        (is) => !kserveExclusions.some((ext) => ext.properties.filter(is)),
      );
    }

    if (filterFn) {
      services = services.filter(filterFn);
    }

    return services;
  }, [inferenceServices, kserveExclusions, filterFn]);

  const deployments: KServeDeployment[] = React.useMemo(
    () =>
      filteredInferenceServices.map((inferenceService) => {
        const servingRuntime = servingRuntimes.find(
          (sr) => sr.metadata.name === inferenceService.spec.predictor.model?.runtime,
        );
        return {
          modelServingPlatformId: KSERVE_ID,
          model: inferenceService,
          server: servingRuntime,
          status: getKServeDeploymentStatus(inferenceService, deploymentPods),
          endpoints: getKServeDeploymentEndpoints(inferenceService),
          apiProtocol: servingRuntime
            ? getAPIProtocolFromServingRuntime(servingRuntime)
            : undefined,
        };
      }),
    [filteredInferenceServices, servingRuntimes, deploymentPods],
  );

  const effectivelyLoaded = Boolean(
    (inferenceServiceLoaded || inferenceServiceError) &&
      (servingRuntimeLoaded || servingRuntimeError) &&
      (deploymentPodsLoaded || deploymentPodsError) &&
      exclusionsResolved,
  );

  const errors = React.useMemo(() => {
    return [inferenceServiceError, servingRuntimeError, deploymentPodsError].filter(
      (error): error is Error => Boolean(error),
    );
  }, [inferenceServiceError, servingRuntimeError, deploymentPodsError]);

  return [deployments, effectivelyLoaded, errors];
};

export const fetchDeploymentStatus = async (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<KServeDeployment | null> => {
  try {
    const inferenceService = await getInferenceService(name, namespace, opts);

    const deploymentPods = await getInferenceServicePods(name, namespace);

    const deployment: KServeDeployment = {
      modelServingPlatformId: KSERVE_ID,
      model: inferenceService,
      status: getKServeDeploymentStatus(inferenceService, deploymentPods),
    };

    return deployment;
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }
    throw error;
  }
};

export const deleteDeployment = async (deployment: KServeDeployment): Promise<void> => {
  await Promise.all([
    deleteInferenceService(deployment.model.metadata.name, deployment.model.metadata.namespace),
    ...(deployment.server
      ? [
          deleteServingRuntime(
            deployment.server.metadata.name,
            deployment.server.metadata.namespace,
          ),
        ]
      : []),
  ]);
};
