import { V1ConfigMap, V1Secret } from '@kubernetes/client-node';
import { ConfigSecretItem, KubeFastifyInstance } from '../../../types';

export const listSecrets = async (
  fastify: KubeFastifyInstance,
  modelRegistryNamespace: string,
): Promise<{ items: V1Secret[] }> => {
  const response = await (fastify.kube.coreV1Api.listNamespacedSecret(
    modelRegistryNamespace,
  ) as Promise<{ body: { items: V1Secret[] } }>);
  return response.body;
};

export const listConfigMaps = async (
  fastify: KubeFastifyInstance,
  modelRegistryNamespace: string,
): Promise<{ items: V1ConfigMap[] }> => {
  const response = await (fastify.kube.coreV1Api.listNamespacedConfigMap(
    modelRegistryNamespace,
  ) as Promise<{ body: { items: V1ConfigMap[] } }>);
  return response.body;
};

export const listModelRegistryCertificateNames = async (
  fastify: KubeFastifyInstance,
  namespace: string,
): Promise<{
  secrets: ConfigSecretItem[];
  configMaps: ConfigSecretItem[];
}> => {
  try {
    const [secretsResponse, configMapsResponse] = await Promise.all([
      listSecrets(fastify, namespace),
      listConfigMaps(fastify, namespace),
    ]);

    const secrets = secretsResponse.items
      .filter((secret) => secret.type === 'Opaque')
      .map((secret) => {
        const keys = Object.keys(secret.data || {}).filter(
          (key) => secret.data?.[key] !== undefined && secret.data[key] !== '',
        );
        return { name: secret.metadata?.name || 'unknown', keys };
      })
      .filter((secret) => secret.keys.length > 0);

    const configMaps = configMapsResponse.items
      .map((configMap) => {
        const keys = Object.keys(configMap.data || {}).filter(
          (key) => configMap.data?.[key] !== undefined && configMap.data[key] !== '',
        );
        return { name: configMap.metadata?.name || 'unknown', keys };
      })
      .filter((configMap) => configMap.keys.length > 0);

    return { secrets, configMaps };
  } catch (e: any) {
    fastify.log.error(
      `Error fetching config maps and secrets, ${e.response?.body?.message || e.message}`,
    );
    throw e;
  }
};
