import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import type { SecretOps } from '@odh-dashboard/plugin-core';
import type { ServiceAccountKind } from '@odh-dashboard/k8s-core';
import { ServiceAccountModel } from '@odh-dashboard/k8s-core/api/models';
import { getServiceAccount } from '@odh-dashboard/k8s-core/api/serviceAccounts';
import {
  getHfTokenServiceAccountName,
  HF_TOKEN_DASHBOARD_LABEL,
  isDashboardManagedHfTokenSecret,
} from '../shared/hfTokenConstants';

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

/**
 * Ties the dashboard HF ServiceAccount to the deployment so it is garbage-collected on delete.
 * Uses a JSON patch (same approach as HF Secret ownership) to avoid full-resource replace races
 * with OpenShift-managed SA fields (e.g. dockercfg).
 */
export const patchHfTokenServiceAccountOwnerReference = async (
  namespace: string,
  deployment: K8sResourceCommon,
  serviceAccountName: string | undefined,
  uid: string,
  dryRun?: boolean,
): Promise<void> => {
  const deploymentName = deployment.metadata?.name;
  const { apiVersion, kind } = deployment;
  if (
    dryRun ||
    !uid ||
    !namespace ||
    !serviceAccountName ||
    !deploymentName ||
    !apiVersion ||
    !kind
  ) {
    return;
  }

  const expectedName = getHfTokenServiceAccountName(deploymentName);
  if (serviceAccountName !== expectedName) {
    return;
  }

  try {
    const existing = await getServiceAccount(serviceAccountName, namespace);
    if (existing.metadata.labels?.[HF_TOKEN_DASHBOARD_LABEL] !== 'true') {
      return;
    }
    if (existing.metadata.ownerReferences?.some((ref) => ref.uid === uid)) {
      return;
    }

    await k8sPatchResource<ServiceAccountKind>({
      model: ServiceAccountModel,
      queryOptions: { name: serviceAccountName, ns: namespace },
      patches: [
        {
          op: 'add',
          path: '/metadata/ownerReferences',
          value: [
            ...(existing.metadata.ownerReferences || []),
            {
              uid,
              name: deploymentName,
              apiVersion,
              kind,
              blockOwnerDeletion: false,
            },
          ],
        },
      ],
    });
  } catch (err) {
    console.warn('Skipping HF token ServiceAccount owner reference patch', err);
  }
};
