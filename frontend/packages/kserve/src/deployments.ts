import React from 'react';
import {
  InferenceServiceKind,
  K8sAPIOptions,
  ProjectKind,
  ServingRuntimeKind,
} from '@odh-dashboard/internal/k8sTypes';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import {
  InferenceServiceModel,
  ServingRuntimeModel,
} from '@odh-dashboard/internal/api/models/kserve';
import { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import { Deployment } from '@odh-dashboard/model-serving/extension-points';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { KSERVE_ID } from '../extensions';

export type KServeDeployment = Deployment<InferenceServiceKind, ServingRuntimeKind>;
export const isKServeDeployment = (
  deployment: Deployment<K8sResourceCommon, K8sResourceCommon>,
): deployment is KServeDeployment => deployment.modelServingPlatformId === KSERVE_ID;

export const useWatchDeployments = (
  project: ProjectKind,
  opts?: K8sAPIOptions,
): [KServeDeployment[] | undefined, boolean, Error | undefined] => {
  const [inferenceServiceList, inferenceServiceLoaded, inferenceServiceError]: CustomWatchK8sResult<
    InferenceServiceKind[]
  > = useK8sWatchResourceList<InferenceServiceKind[]>(
    {
      isList: true,
      groupVersionKind: groupVersionKind(InferenceServiceModel),
      namespace: project.metadata.name,
    },
    InferenceServiceModel,
    opts,
  );

  const [servingRuntimeList, servingRuntimeLoaded, servingRuntimeError]: CustomWatchK8sResult<
    ServingRuntimeKind[]
  > = useK8sWatchResourceList<ServingRuntimeKind[]>(
    {
      isList: true,
      groupVersionKind: groupVersionKind(ServingRuntimeModel),
      namespace: project.metadata.name,
    },
    ServingRuntimeModel,
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
      })),
    [inferenceServiceList, servingRuntimeList],
  );

  return [
    deployments,
    inferenceServiceLoaded && servingRuntimeLoaded,
    inferenceServiceError || servingRuntimeError,
  ];
};
