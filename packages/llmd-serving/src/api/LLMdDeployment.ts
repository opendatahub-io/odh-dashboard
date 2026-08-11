import { k8sDeleteResource, K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import { getGenericErrorCode } from '@odh-dashboard/internal/api/errorUtils';
import { deleteLLMInferenceServiceConfig } from './LLMInferenceServiceConfigs';
import {
  LLMInferenceServiceModel,
  TOPOLOGY_CONFIG_REF_ANNOTATION,
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

  // The accelerator config copy shares the deployment's name
  const hasMatchingConfig = deployment.model.spec.baseRefs?.some((ref) => ref.name === name);
  if (hasMatchingConfig) {
    deletions.push(deleteLLMInferenceServiceConfig(name, namespace));
  }

  // The local copy of the topology config is recorded on the deployment by annotation
  const topologyConfigName =
    deployment.model.metadata.annotations?.[TOPOLOGY_CONFIG_REF_ANNOTATION];
  if (topologyConfigName && topologyConfigName !== name) {
    deletions.push(
      deleteLLMInferenceServiceConfig(topologyConfigName, namespace).catch((e: unknown) => {
        // Don't block the deletion if not found. It could be in the global namespace by accident
        if (getGenericErrorCode(e) !== 404) {
          throw e;
        }
      }),
    );
  }

  await Promise.all(deletions);
};
