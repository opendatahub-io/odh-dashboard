import type { HuggingFaceApiKeyFieldData } from '@odh-dashboard/model-serving/shared/wizard-fields';
import {
  getHfTokenServiceAccountName,
  HF_TOKEN_ENV_NAME,
} from '@odh-dashboard/model-serving/shared/hfTokenConstants';
import {
  getHfTokenSecretNameFromServiceAccount,
  resolveHfTokenSecretName,
  resolveHfTokenServiceAccountName,
} from '@odh-dashboard/model-serving/shared/hfTokenSecret';
import type { LLMInferenceServiceKind } from './types';
import { structuredCloneWithMainContainer } from './deployments/model';

export { resolveHfTokenSecretName, resolveHfTokenServiceAccountName };

/**
 * Source of truth is the ServiceAccount (`{deployment}-hf-sa`) and its Secret refs.
 * LLMInferenceService has no official HF docs; template.serviceAccountName follows KServe samples.
 */
export const extractHuggingFaceApiKey = async (
  deployment: LLMInferenceServiceKind,
): Promise<HuggingFaceApiKeyFieldData | null> => {
  const { name: deploymentName, namespace } = deployment.metadata;
  const serviceAccountName = deployment.spec.template?.serviceAccountName;
  if (!deploymentName || !namespace || !serviceAccountName) {
    return null;
  }
  if (serviceAccountName !== getHfTokenServiceAccountName(deploymentName)) {
    return null;
  }

  try {
    const configuredSecretName = await getHfTokenSecretNameFromServiceAccount(
      serviceAccountName,
      namespace,
    );
    if (!configuredSecretName) {
      return null;
    }
    return {
      token: '',
      configuredSecretName,
    };
  } catch {
    return null;
  }
};

/**
 * Best-effort Option 1 for LLMInferenceService: set template.serviceAccountName.
 * Official HF + LLMISVC docs are unclear; this matches multi-node KServe samples.
 */
export const applyHfTokenServiceAccount = (
  llmInferenceService: LLMInferenceServiceKind,
  secretName?: string,
  serviceAccountName?: string,
): LLMInferenceServiceKind => {
  if (!secretName || !serviceAccountName) {
    return llmInferenceService;
  }

  const { result, mainContainer } = structuredCloneWithMainContainer(llmInferenceService);
  result.spec.template = {
    ...result.spec.template,
    serviceAccountName,
  };

  const existingEnv = mainContainer.env ?? [];
  const envWithoutHfToken = existingEnv.filter((envVar) => envVar.name !== HF_TOKEN_ENV_NAME);
  mainContainer.env = envWithoutHfToken;
  if (envWithoutHfToken.length === 0) {
    delete mainContainer.env;
  }

  return result;
};
