import type { HuggingFaceApiKeyFieldData } from '@odh-dashboard/model-serving/shared/wizard-fields';
import {
  getConfiguredHfTokenSecretName,
  HF_TOKEN_ENV_NAME,
} from '@odh-dashboard/model-serving/shared/hfTokenConstants';
import type { LLMInferenceServiceKind } from './types';
import { structuredCloneWithMainContainer } from './deployments/model';

export { resolveHfTokenSecretName } from '@odh-dashboard/model-serving/shared/hfTokenSecret';

export const extractHuggingFaceApiKeyFromEnv = (
  deployment: LLMInferenceServiceKind,
): HuggingFaceApiKeyFieldData | null => {
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

export const applyHfTokenEnvVar = (
  llmInferenceService: LLMInferenceServiceKind,
  secretName?: string,
): LLMInferenceServiceKind => {
  if (!secretName) {
    return llmInferenceService;
  }

  const { result, mainContainer } = structuredCloneWithMainContainer(llmInferenceService);
  const existingEnv = mainContainer.env ?? [];
  const envWithoutHfToken = existingEnv.filter((envVar) => envVar.name !== HF_TOKEN_ENV_NAME);

  mainContainer.env = [
    ...envWithoutHfToken,
    {
      name: HF_TOKEN_ENV_NAME,
      valueFrom: {
        secretKeyRef: {
          name: secretName,
          key: HF_TOKEN_ENV_NAME,
        },
      },
    },
  ];

  return result;
};
