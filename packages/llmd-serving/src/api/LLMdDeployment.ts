import { k8sDeleteResource, K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import {
  LLMInferenceServiceConfigModel,
  LLMInferenceServiceModel,
  type LLMdDeployment,
} from '../types';

export const deleteDeployment = async (deployment: LLMdDeployment): Promise<void> => {
  const { name, namespace } = deployment.model.metadata;

  const hasMatchingConfig = deployment.model.spec.baseRefs?.some((ref) => ref.name === name);
  if (hasMatchingConfig) {
    await k8sDeleteResource<typeof LLMInferenceServiceConfigModel, K8sStatus>({
      model: LLMInferenceServiceConfigModel,
      queryOptions: { name, ns: namespace },
    });
  }

  await k8sDeleteResource<typeof LLMInferenceServiceModel, K8sStatus>({
    model: LLMInferenceServiceModel,
    queryOptions: { name, ns: namespace },
  });
};
