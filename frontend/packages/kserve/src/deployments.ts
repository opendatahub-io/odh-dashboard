// eslint-disable-next-line import/no-extraneous-dependencies
import {
  InferenceServiceKind,
  K8sAPIOptions,
  ProjectKind,
  ServingRuntimeKind,
} from '@odh-dashboard/internal/k8sTypes';
// eslint-disable-next-line import/no-extraneous-dependencies
import { listInferenceService, listServingRuntimes } from '@odh-dashboard/internal/api/index';
import { Deployment } from '@odh-dashboard/model-serving/extension-points';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';

export type KServeDeployment = Deployment<InferenceServiceKind, ServingRuntimeKind>;
export const isKServeDeployment = (
  deployment: Deployment<K8sResourceCommon, K8sResourceCommon>,
): deployment is KServeDeployment => deployment.modelServingPlatformId === 'kserve';

export const listDeployments = async (
  project: ProjectKind,
  opts: K8sAPIOptions,
): Promise<KServeDeployment[]> => {
  const inferenceServiceList = await listInferenceService(
    project.metadata.name,
    'opendatahub.io/dashboard=true',
    opts,
  );
  const servingRuntimeList = await listServingRuntimes(
    project.metadata.name,
    'opendatahub.io/dashboard=true',
    opts,
  );

  return inferenceServiceList.map((inferenceService) => ({
    modelServingPlatformId: 'kserve',
    model: inferenceService,
    server: servingRuntimeList.find(
      (servingRuntime) =>
        servingRuntime.metadata.name === inferenceService.spec.predictor.model?.runtime,
    ),
  }));
};
