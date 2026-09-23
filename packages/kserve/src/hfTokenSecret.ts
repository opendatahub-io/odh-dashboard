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
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';

export { resolveHfTokenSecretName, resolveHfTokenServiceAccountName };

/**
 * Source of truth is the ServiceAccount (`{deployment}-hf-sa`) and its Secret refs.
 */
export const extractHuggingFaceApiKey = async (
  deployment: InferenceServiceKind,
): Promise<HuggingFaceApiKeyFieldData | null> => {
  const { name: deploymentName, namespace } = deployment.metadata;
  const { serviceAccountName } = deployment.spec.predictor;
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
 * KServe Option 1: set predictor.serviceAccountName.
 * Removes any leftover HF_TOKEN env var from the model container.
 */
export const applyHfTokenServiceAccount = (
  inferenceService: InferenceServiceKind,
  secretName?: string,
  serviceAccountName?: string,
): InferenceServiceKind => {
  if (!secretName || !serviceAccountName) {
    return inferenceService;
  }

  const result = structuredClone(inferenceService);
  result.spec.predictor.serviceAccountName = serviceAccountName;

  const existingEnv = result.spec.predictor.model?.env ?? [];
  const envWithoutHfToken = existingEnv.filter((envVar) => envVar.name !== HF_TOKEN_ENV_NAME);
  if (result.spec.predictor.model) {
    result.spec.predictor.model = {
      ...result.spec.predictor.model,
      env: envWithoutHfToken,
    };
    if (envWithoutHfToken.length === 0) {
      delete result.spec.predictor.model.env;
    }
  }

  return result;
};
