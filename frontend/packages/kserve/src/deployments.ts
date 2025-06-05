import React from 'react';
import {
  InferenceServiceKind,
  K8sAPIOptions,
  ProjectKind,
  ServingRuntimeKind,
} from '@odh-dashboard/internal/k8sTypes';
import { Deployment } from '@odh-dashboard/model-serving/extension-points';
import { deleteInferenceService, deleteServingRuntime } from '@odh-dashboard/internal/api/index';
import { getKServeDeploymentEndpoints } from './deploymentEndpoints';
import { useWatchDeploymentPods, useWatchServingRuntimes, useWatchInferenceServices } from './api';
import { getKServeDeploymentStatus } from './deploymentStatus';
import { KSERVE_ID } from '../extensions';

export type KServeDeployment = Deployment<InferenceServiceKind, ServingRuntimeKind>;
export const isKServeDeployment = (deployment: Deployment): deployment is KServeDeployment =>
  deployment.modelServingPlatformId === KSERVE_ID;

export const useWatchDeployments = (
  project: ProjectKind,
  opts?: K8sAPIOptions,
): [KServeDeployment[] | undefined, boolean, Error | undefined] => {
  const [inferenceServices, inferenceServiceLoaded, inferenceServiceError] =
    useWatchInferenceServices(project, opts);
  const [servingRuntimes, servingRuntimeLoaded, servingRuntimeError] = useWatchServingRuntimes(
    project,
    opts,
  );
  const [deploymentPods, deploymentPodsLoaded, deploymentPodsError] = useWatchDeploymentPods(
    project,
    opts,
  );

  const deployments: KServeDeployment[] = React.useMemo(
    () =>
      inferenceServices.map((inferenceService) => ({
        modelServingPlatformId: KSERVE_ID,
        model: inferenceService,
        server: servingRuntimes.find(
          (servingRuntime) =>
            servingRuntime.metadata.name === inferenceService.spec.predictor.model?.runtime,
        ),
        status: getKServeDeploymentStatus(inferenceService, deploymentPods),
        endpoints: getKServeDeploymentEndpoints(inferenceService),
      })),
    [inferenceServices, servingRuntimes, deploymentPods],
  );

  return [
    deployments,
    inferenceServiceLoaded && servingRuntimeLoaded && deploymentPodsLoaded,
    inferenceServiceError || servingRuntimeError || deploymentPodsError,
  ];
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
