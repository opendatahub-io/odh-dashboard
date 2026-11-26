import {
  k8sDeleteResource,
  K8sStatusError,
  type K8sStatus,
} from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/k8s-core';
import { getGenericErrorCode } from '@odh-dashboard/k8s-core/api/errorUtils';
import type { ModelServingDeleteOptions } from '@odh-dashboard/model-serving/extension-points';
import { deleteLLMInferenceServiceConfig } from './LLMInferenceServiceConfigs';
import {
  LLMInferenceServiceConfigModel,
  LLMInferenceServiceModel,
  TOPOLOGY_CONFIG_REF_ANNOTATION,
  ACCELERATOR_CONFIG_REF_ANNOTATION,
  type LLMdDeployment,
} from '../types';

const ignoreMissingResource = (error: unknown): void => {
  const code = error instanceof K8sStatusError ? error.status.code : getGenericErrorCode(error);
  if (code !== 404) {
    throw error;
  }
};

export const deleteDeployment = async (
  deployment: LLMdDeployment,
  { checkAccess, dryRun }: ModelServingDeleteOptions = {},
): Promise<void> => {
  const { name, namespace } = deployment.model.metadata;
  const configNames = new Set<string>();

  // The simple-vLLM config copy shares the deployment's name
  if (deployment.model.spec.baseRefs?.some((ref) => ref.name === name)) {
    configNames.add(name);
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
    if (configName) {
      configNames.add(configName);
    }
  }

  if (checkAccess) {
    await Promise.all(
      [...configNames].map(async (configName) => {
        const allowed = await checkAccess({
          group: LLMInferenceServiceConfigModel.apiGroup,
          resource: LLMInferenceServiceConfigModel.plural,
          verb: 'delete',
          namespace,
          name: configName,
          subresource: '',
        });
        if (!allowed) {
          throw new Error(
            `Access denied to delete configuration "${configName}" in project "${namespace}".`,
          );
        }
      }),
    );
  }

  await k8sDeleteResource<typeof LLMInferenceServiceModel, K8sStatus>(
    applyK8sAPIOptions(
      { model: LLMInferenceServiceModel, queryOptions: { name, ns: namespace } },
      { dryRun },
    ),
  ).catch(ignoreMissingResource);
  try {
    await Promise.all(
      [...configNames].map((configName) =>
        deleteLLMInferenceServiceConfig(configName, namespace, { dryRun }).catch(
          ignoreMissingResource,
        ),
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      dryRun
        ? `Configuration deletion dry run failed. ${message}`
        : `Model deletion was accepted, but configuration cleanup failed. ${message}`,
    );
  }
};
