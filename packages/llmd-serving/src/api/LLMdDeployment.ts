import { k8sDeleteResource, K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import {
  LLMInferenceServiceConfigModel,
  LLMInferenceServiceModel,
  type LLMdDeployment,
} from '../types';

export const deleteDeployment = async (deployment: LLMdDeployment): Promise<void> => {
  const { name, namespace } = deployment.model.metadata;

  const deleteService = k8sDeleteResource<typeof LLMInferenceServiceModel, K8sStatus>({
    model: LLMInferenceServiceModel,
    queryOptions: { name, ns: namespace },
  });

  const hasMatchingConfig = deployment.model.spec.baseRefs?.some((ref) => ref.name === name);
  if (hasMatchingConfig) {
    const deleteConfig = k8sDeleteResource<typeof LLMInferenceServiceConfigModel, K8sStatus>({
      model: LLMInferenceServiceConfigModel,
      queryOptions: { name, ns: namespace },
    }).catch((e: unknown) => {
      if (
        e != null &&
        typeof e === 'object' &&
        'statusObject' in e &&
        (e as { statusObject?: { code?: number } }).statusObject?.code === 404
      ) {
        return undefined;
      }
      throw e;
    });
    await Promise.all([deleteService, deleteConfig]);
  } else {
    await deleteService;
  }
};
