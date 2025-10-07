import { k8sDeleteResource, K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import { Deployment } from '@odh-dashboard/model-serving/extension-points';
import { LLMInferenceServiceModel, type LLMdDeployment } from './types';
import { LLMD_SERVING_ID } from '../extensions/extensions';

export const isLLMdDeployment = (deployment: Deployment): deployment is LLMdDeployment =>
  deployment.modelServingPlatformId === LLMD_SERVING_ID;

export const deleteDeployment = async (deployment: LLMdDeployment): Promise<void> => {
  await k8sDeleteResource<typeof LLMInferenceServiceModel, K8sStatus>({
    model: LLMInferenceServiceModel,
    queryOptions: {
      name: deployment.model.metadata.name,
      ns: deployment.model.metadata.namespace,
    },
  });
};
