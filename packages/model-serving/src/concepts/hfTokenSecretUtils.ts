import type { SecretOps } from '@odh-dashboard/plugin-core';
import { HF_TOKEN_ENV_NAME } from '../shared/hfTokenConstants';
import type { InferenceServiceKind } from '../shared';

export const getHfTokenSecretNameFromDeployment = (
  deployment: InferenceServiceKind,
): string | undefined => {
  const hfEnv = deployment.spec.predictor.model?.env?.find(
    (envVar) =>
      envVar.name === HF_TOKEN_ENV_NAME &&
      envVar.valueFrom?.secretKeyRef?.name !== undefined &&
      envVar.valueFrom.secretKeyRef.key === HF_TOKEN_ENV_NAME,
  );

  return hfEnv?.valueFrom?.secretKeyRef?.name;
};

export const patchHfTokenSecretOwnerReference = async (
  ops: SecretOps,
  deployment: InferenceServiceKind,
  uid: string,
  dryRun?: boolean,
): Promise<void> => {
  if (dryRun || !uid || !deployment.metadata.namespace) {
    return;
  }

  const secretName = getHfTokenSecretNameFromDeployment(deployment);
  if (!secretName) {
    return;
  }

  try {
    const secret = await ops.getSecret(deployment.metadata.namespace, secretName);
    await ops.patchSecretWithOwnerReference(secret, deployment, uid);
  } catch (err) {
    console.warn('Skipping HF token secret owner reference patch', err);
  }
};
