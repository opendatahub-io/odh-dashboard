import React from 'react';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import {
  InferenceServiceKind,
  K8sAPIOptions,
  ProjectKind,
  ServingRuntimeKind,
} from '@odh-dashboard/internal/k8sTypes';
import { Deployment } from '@odh-dashboard/model-serving/extension-points';
import { deleteInferenceService, deleteServingRuntime } from '@odh-dashboard/internal/api/index';
import {
  useWatchDeploymentPods,
  useWatchServingRuntimeList,
  useWatchInferenceServiceList,
} from './api';
import { getKServeDeploymentStatus } from './deploymentStatus';
import { KSERVE_ID } from '../extensions';

export type KServeDeployment = Deployment<InferenceServiceKind, ServingRuntimeKind>;
export const isKServeDeployment = (
  deployment: Deployment<K8sResourceCommon, K8sResourceCommon>,
): deployment is KServeDeployment => deployment.modelServingPlatformId === KSERVE_ID;

export const useWatchDeployments = (
  project: ProjectKind,
  opts?: K8sAPIOptions,
): [KServeDeployment[] | undefined, boolean, Error | undefined] => {
  const [inferenceServiceList, inferenceServiceLoaded, inferenceServiceError] =
    useWatchInferenceServiceList(project, opts);
  const [servingRuntimeList, servingRuntimeLoaded, servingRuntimeError] =
    useWatchServingRuntimeList(project, opts);
  const [deploymentPods, deploymentPodsLoaded, deploymentPodsError] = useWatchDeploymentPods(
    project,
    opts,
  );

  const deployments: KServeDeployment[] = React.useMemo(
    () =>
      inferenceServiceList.map((inferenceService) => ({
        modelServingPlatformId: KSERVE_ID,
        model: inferenceService,
        server: servingRuntimeList.find(
          (servingRuntime) =>
            servingRuntime.metadata.name === inferenceService.spec.predictor.model?.runtime,
        ),
        status: getKServeDeploymentStatus(inferenceService, deploymentPods),
      })),
    [inferenceServiceList, servingRuntimeList, deploymentPods],
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
