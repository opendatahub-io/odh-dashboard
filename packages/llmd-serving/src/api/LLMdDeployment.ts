import { k8sDeleteResource, K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import { LLMInferenceServiceModel, type LLMdDeployment } from '../types';

export const deleteDeployment = async (deployment: LLMdDeployment): Promise<void> => {
  await k8sDeleteResource<typeof LLMInferenceServiceModel, K8sStatus>({
    model: LLMInferenceServiceModel,
    queryOptions: {
      name: deployment.model.metadata.name,
      ns: deployment.model.metadata.namespace,
    },
  });
};
