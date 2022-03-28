import { KubeFastifyInstance } from '../types';

export const scaleDeploymentConfig = async (
  fastify: KubeFastifyInstance,
  name: string,
  replicas: number,
): Promise<void> => {
  const customObjectsApi = fastify.kube.customObjectsApi;
  const group = 'apps.openshift.io';
  const version = 'v1';
  const plural = 'deploymentconfigs';
  const namespace = fastify.kube.namespace;
  try {
    const res = await customObjectsApi.getNamespacedCustomObject(
      group,
      version,
      namespace,
      plural,
      name,
    );
    const deployment: any = res.body;

    deployment.spec.replicas = replicas;

    await customObjectsApi.replaceNamespacedCustomObject(
      group,
      version,
      namespace,
      plural,
      name,
      deployment,
    );
  } catch (e) {
    throw new Error('Error scale the deployment pods: ' + e.message);
  }
};
