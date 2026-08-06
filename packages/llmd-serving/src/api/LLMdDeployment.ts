import { k8sDeleteResource, K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import { getGenericErrorCode } from '@odh-dashboard/internal/api/errorUtils';
import {
  LLMInferenceServiceConfigModel,
  LLMInferenceServiceModel,
  type LLMdDeployment,
} from '../types';

const ignoreNotFound = async (promise: Promise<unknown>): Promise<void> => {
  try {
    await promise;
  } catch (e) {
    if (getGenericErrorCode(e) !== 404) {
      throw e;
    }
  }
};

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
    });
    await Promise.all([deleteService, ignoreNotFound(deleteConfig)]);
  } else {
    await deleteService;
  }
};
