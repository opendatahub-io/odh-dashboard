import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type { SecretOps } from '@odh-dashboard/plugin-core';
import {
  type HfTokenEnvVar,
  isDashboardManagedHfTokenEnvVar,
  isDashboardManagedHfTokenSecret,
} from '../shared/hfTokenConstants';
import { isInferenceServiceKind } from '../shared';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isHfTokenEnvVar = (value: unknown): value is HfTokenEnvVar =>
  isRecord(value) && typeof value.name === 'string';

const getLlmMainContainerEnv = (deployment: K8sResourceCommon): HfTokenEnvVar[] | undefined => {
  if (deployment.kind !== 'LLMInferenceService' || !isRecord(deployment.spec)) {
    return undefined;
  }

  const { template } = deployment.spec;
  if (!isRecord(template) || !Array.isArray(template.containers)) {
    return undefined;
  }

  const mainContainer = template.containers.find(
    (container) => isRecord(container) && container.name === 'main',
  );
  if (!isRecord(mainContainer) || !Array.isArray(mainContainer.env)) {
    return undefined;
  }

  return mainContainer.env.filter(isHfTokenEnvVar);
};

const getHfTokenEnvFromDeployment = (deployment: K8sResourceCommon): HfTokenEnvVar | undefined => {
  if (isInferenceServiceKind(deployment)) {
    return deployment.spec.predictor.model?.env?.find(isDashboardManagedHfTokenEnvVar);
  }

  if (deployment.kind === 'LLMInferenceService') {
    return getLlmMainContainerEnv(deployment)?.find(isDashboardManagedHfTokenEnvVar);
  }

  return undefined;
};

const hasNamedOwnerMetadata = (
  deployment: K8sResourceCommon,
): deployment is K8sResourceCommon & { metadata: { name: string } } =>
  typeof deployment.metadata?.name === 'string';

export const getHfTokenSecretNameFromDeployment = (
  deployment: K8sResourceCommon,
): string | undefined => {
  const hfEnv = getHfTokenEnvFromDeployment(deployment);

  return hfEnv?.valueFrom?.secretKeyRef?.name;
};

export const patchHfTokenSecretOwnerReference = async (
  ops: SecretOps,
  deployment: K8sResourceCommon,
  uid: string,
  dryRun?: boolean,
): Promise<void> => {
  const namespace = deployment.metadata?.namespace;
  if (dryRun || !uid || !namespace || !hasNamedOwnerMetadata(deployment)) {
    return;
  }

  const secretName = getHfTokenSecretNameFromDeployment(deployment);
  if (!secretName) {
    return;
  }

  try {
    const secret = await ops.getSecret(namespace, secretName);
    if (!isDashboardManagedHfTokenSecret(secret)) {
      return;
    }
    await ops.patchSecretWithOwnerReference(secret, deployment, uid);
  } catch (err) {
    console.warn('Skipping HF token secret owner reference patch', err);
  }
};
