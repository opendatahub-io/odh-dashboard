import { KubeFastifyInstance } from '../types';

export const rolloutDeployment = async (
  fastify: KubeFastifyInstance,
  namespace: string,
  name: string,
): Promise<void> => {
  const customObjectsApi = fastify.kube.customObjectsApi;
  const group = 'apps.openshift.io';
  const version = 'v1';
  const plural = `deploymentconfigs/${name}/instantiate`;
  const body = {
    kind: 'DeploymentRequest',
    apiVersion: 'apps.openshift.io/v1',
    name,
    latest: true,
    force: true,
  };
  try {
    await customObjectsApi.createNamespacedCustomObject(group, version, namespace, plural, body);
  } catch (e) {
    throw new Error('Error rollout the deployment: ' + e.message);
  }
};
