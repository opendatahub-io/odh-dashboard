import { KubeFastifyInstance } from '../types';
import { MERGE_PATCH } from './k8sClient';

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
  try {
    await customObjectsApi.patchNamespacedCustomObject(
      { group, version, namespace, plural, name, body },
      MERGE_PATCH,
    );
  } catch (e) {
    throw new Error('Error rolling out the deployment: ' + e.message);
  }
};
