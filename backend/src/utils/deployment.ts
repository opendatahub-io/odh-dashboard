import { PatchUtils } from '@kubernetes/client-node';
import { KubeFastifyInstance } from '../types';

export const rolloutDeployment = async (
  fastify: KubeFastifyInstance,
  namespace: string,
  name: string,
): Promise<void> => {
  const customObjectsApi = fastify.kube.customObjectsApi;
  const group = 'apps';
  const version = 'v1';
  const plural = 'deployments';
  const body = {
    spec: {
      template: {
        metadata: {
          annotations: {
            'kubectl.kubernetes.io/restartedAt': new Date().toISOString(),
          },
          labels: {
            'opendatahub.io/dashboard': 'true',
          },
        },
      },
    },
  };
  const options = {
    headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH },
  };
  try {
    await customObjectsApi.patchNamespacedCustomObject(
      group,
      version,
      namespace,
      plural,
      name,
      body,
      undefined,
      undefined,
      undefined,
      options,
    );
  } catch (e) {
    throw new Error('Error rolling out the deployment: ' + e.message);
  }
};
