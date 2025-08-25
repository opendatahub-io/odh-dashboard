import React from 'react';
import {
  InferenceServiceKind,
  K8sAPIOptions,
  KnownLabels,
  ProjectKind,
  ServingRuntimeKind,
} from '@odh-dashboard/internal/k8sTypes';
import { Deployment } from '@odh-dashboard/model-serving/extension-points';
import { deleteInferenceService, deleteServingRuntime } from '@odh-dashboard/internal/api/index';
import { getAPIProtocolFromServingRuntime } from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/utils';
import { getKServeDeploymentEndpoints } from './deploymentEndpoints';
import { useWatchDeploymentPods, useWatchServingRuntimes, useWatchInferenceServices } from './api';
import { getKServeDeploymentStatus } from './deploymentStatus';
import { KSERVE_ID } from '../extensions';

export type KServeDeployment = Deployment<InferenceServiceKind, ServingRuntimeKind>;
export const isKServeDeployment = (deployment: Deployment): deployment is KServeDeployment =>
  deployment.modelServingPlatformId === KSERVE_ID;

export const useWatchDeployments = (
  project: ProjectKind,
  labelSelectors?: { [key: string]: string },
  mrName?: string,
  opts?: K8sAPIOptions,
): [KServeDeployment[] | undefined, boolean, Error | undefined] => {
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
  let inferenceServicesWithMrNameFilter = inferenceServices;
  if (mrName) {
    inferenceServicesWithMrNameFilter = inferenceServices.filter(
      (inferenceService) =>
        inferenceService.metadata.labels?.[KnownLabels.MODEL_REGISTRY_NAME] === mrName ||
        !inferenceService.metadata.labels?.[KnownLabels.MODEL_REGISTRY_NAME],
    );
  }

  const deployments: KServeDeployment[] = React.useMemo(
    () =>
      inferenceServicesWithMrNameFilter.map((inferenceService) => {
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
