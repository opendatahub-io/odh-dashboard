import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type { SecretOps } from '@odh-dashboard/plugin-core';
import { isDashboardManagedHfTokenSecret } from '../shared/hfTokenConstants';

export const patchHfTokenSecretOwnerReference = async (
  ops: SecretOps,
  namespace: string,
  deployment: K8sResourceCommon,
  secretName: string | undefined,
  uid: string,
  dryRun?: boolean,
): Promise<void> => {
  const deploymentName = deployment.metadata?.name;
  if (dryRun || !uid || !namespace || !secretName || !deploymentName) {
    return;
  }

  try {
    const secret = await ops.getSecret(namespace, secretName);
    if (!isDashboardManagedHfTokenSecret(secret)) {
      return;
    }
    await ops.patchSecretWithOwnerReference(
      secret,
      { ...deployment, metadata: { ...deployment.metadata, name: deploymentName } },
      uid,
    );
  } catch (err) {
    console.warn('Skipping HF token secret owner reference patch', err);
  }
};
