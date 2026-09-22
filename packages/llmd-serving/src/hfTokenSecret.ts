import type { HuggingFaceApiKeyFieldData } from '@odh-dashboard/model-serving/shared/wizard-fields';
import {
  getConfiguredHfTokenSecretName,
  HF_TOKEN_ENV_NAME,
  HF_TOKEN_SECRET_ANNOTATION,
} from '@odh-dashboard/model-serving/shared/hfTokenConstants';
import type { LLMInferenceServiceKind } from './types';
import { structuredCloneWithMainContainer } from './deployments/model';

export {
  resolveHfTokenSecretName,
  resolveHfTokenServiceAccountName,
} from '@odh-dashboard/model-serving/shared/hfTokenSecret';

/**
 * Prefer SA + annotation (Option 1). Fall back to legacy main-container env for older deploys.
 * LLMInferenceService has no official HF docs; template.serviceAccountName follows KServe samples.
 */
export const extractHuggingFaceApiKey = (
  deployment: LLMInferenceServiceKind,
): HuggingFaceApiKeyFieldData | null => {
  const annotatedSecretName = deployment.metadata.annotations?.[HF_TOKEN_SECRET_ANNOTATION];
  if (annotatedSecretName) {
    return {
      token: '',
      configuredSecretName: annotatedSecretName,
    };
  }

  const configuredSecretName = getConfiguredHfTokenSecretName(
    deployment.spec.template?.containers?.find((container) => container.name === 'main')?.env,
  );

  if (!configuredSecretName) {
    return null;
  }

  return {
    token: '',
    configuredSecretName,
  };
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
  result.metadata.annotations = {
    ...result.metadata.annotations,
    [HF_TOKEN_SECRET_ANNOTATION]: secretName,
  };
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
