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
import { getGenericErrorCode } from '@odh-dashboard/k8s-core/api/errorUtils';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';

export { resolveHfTokenSecretName, resolveHfTokenServiceAccountName };

const is404 = (error: unknown): boolean => getGenericErrorCode(error) === 404;

/**
 * Source of truth is the ServiceAccount (`{deployment}-hf-sa`) and its Secret refs.
 * Missing SA/Secret (404) is treated as unconfigured so the user can supply a replacement.
 * Auth and other API failures propagate to the edit flow.
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
    // SA is ours but Secret may be missing (out-of-band delete) — still surface the field
    // so the user can supply a replacement token.
    return {
      token: '',
      configuredSecretName,
    };
  } catch (error) {
    if (is404(error)) {
      return { token: '' };
    }
    throw error;
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
