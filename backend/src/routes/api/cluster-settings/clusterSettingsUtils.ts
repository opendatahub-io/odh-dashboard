import { FastifyRequest } from 'fastify';
import { KubeFastifyInstance, ClusterSettings } from '../../../types';

export const updateClusterSettings = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<ClusterSettings | string> => {
  const coreV1Api = fastify.kube.coreV1Api;
  const namespace = fastify.kube.namespace;
  const query = request.query as { [key: string]: string };
  try {
    if (query.pvcSize) {
      await coreV1Api.patchNamespacedConfigMap(
        'jupyterhub-cfg',
        namespace,
        {
          data: { singleuser_pvc_size: `${query.pvcSize}Gi` },
        },
        undefined,
        undefined,
        undefined,
        undefined,
        {
          headers: {
            'Content-Type': 'application/merge-patch+json',
          },
        },
      );
    }
    return {
      pvcSize: Number(query.pvcSize),
    };
  } catch (e) {
    if (e.response?.statusCode !== 404) {
      fastify.log.error('Setting cluster settings error: ' + e.toString());
      return 'Unable to update cluster settings.';
    }
  }
};

export const getClusterSettings = async (
  fastify: KubeFastifyInstance,
): Promise<ClusterSettings | string> => {
  const coreV1Api = fastify.kube.coreV1Api;
  const namespace = fastify.kube.namespace;
  try {
    const clusterSettingsRes = await coreV1Api.readNamespacedConfigMap('jupyterhub-cfg', namespace);
    return {
      pvcSize: Number(clusterSettingsRes.body.data.singleuser_pvc_size.replace('Gi', '')),
    };
  } catch (e) {
    if (e.response?.statusCode !== 404) {
      fastify.log.error('Error retrieving cluster settings: ' + e.toString());
    }
    return 'Unable to retrieve cluster settings.';
  }
};
