import { k8sDeleteResource, K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import { getGenericErrorCode } from '@odh-dashboard/k8s-core/api/errorUtils';
import { deleteLLMInferenceServiceConfig } from './LLMInferenceServiceConfigs';
import {
  LLMInferenceServiceModel,
  TOPOLOGY_CONFIG_REF_ANNOTATION,
  ACCELERATOR_CONFIG_REF_ANNOTATION,
  type LLMdDeployment,
} from '../types';

export const deleteDeployment = async (deployment: LLMdDeployment): Promise<void> => {
  const { name, namespace } = deployment.model.metadata;

  const deletions: Promise<unknown>[] = [
    k8sDeleteResource<typeof LLMInferenceServiceModel, K8sStatus>({
      model: LLMInferenceServiceModel,
      queryOptions: { name, ns: namespace },
    }),
  ];

  // The simple-vLLM config copy shares the deployment's name
  const hasMatchingConfig = deployment.model.spec.baseRefs?.some((ref) => ref.name === name);
  if (hasMatchingConfig) {
    deletions.push(deleteLLMInferenceServiceConfig(name, namespace));
  }

  // Local copies of admin configs are recorded on the deployment by annotation. Each is created
  // in the deployment's own namespace at deploy time and must be cleaned up on delete.
  // RHOAIENG-79541 will add ROUTING_CONFIG_REF_ANNOTATION here once routing configs also copy.
  const CONFIG_COPY_ANNOTATIONS = [
    TOPOLOGY_CONFIG_REF_ANNOTATION,
    ACCELERATOR_CONFIG_REF_ANNOTATION,
  ];
  for (const annotationKey of CONFIG_COPY_ANNOTATIONS) {
    const configName = deployment.model.metadata.annotations?.[annotationKey];
    if (configName && configName !== name) {
      deletions.push(
        deleteLLMInferenceServiceConfig(configName, namespace).catch((e: unknown) => {
          // Don't block the deletion if not found. It could be in the global namespace by accident
          if (getGenericErrorCode(e) !== 404) {
            throw e;
          }
        }),
      );
    }
  }

  await Promise.all(deletions);
};
