import type { SecretKind } from '@odh-dashboard/k8s-core';

export const HF_TOKEN_ENV_NAME = 'HF_TOKEN';

export const HF_TOKEN_DASHBOARD_LABEL = 'opendatahub.io/dashboard';

/** Tracks the HF token Secret name on the deployment for edit / rotate flows. */
export const HF_TOKEN_SECRET_ANNOTATION = 'opendatahub.io/hf-token-secret';

export type HfTokenEnvVar = {
  name: string;
  valueFrom?: {
    secretKeyRef?: {
      name?: string;
      key?: string;
    };
  };
};

export const isDashboardManagedHfTokenEnvVar = (envVar: HfTokenEnvVar): boolean =>
  envVar.name === HF_TOKEN_ENV_NAME &&
  envVar.valueFrom?.secretKeyRef?.name !== undefined &&
  envVar.valueFrom.secretKeyRef.key === HF_TOKEN_ENV_NAME;

export const isDashboardManagedHfTokenSecret = (secret: SecretKind): boolean =>
  secret.metadata.labels?.[HF_TOKEN_DASHBOARD_LABEL] === 'true';

export const getConfiguredHfTokenSecretName = (envVars?: HfTokenEnvVar[]): string | undefined => {
  const hfEnv = envVars?.find(isDashboardManagedHfTokenEnvVar);

  return hfEnv?.valueFrom?.secretKeyRef?.name;
};

export const getHfTokenServiceAccountName = (deploymentK8sName: string): string =>
  `${deploymentK8sName}-hf-sa`;
