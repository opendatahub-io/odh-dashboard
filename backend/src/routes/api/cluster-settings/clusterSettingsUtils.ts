import { FastifyRequest } from 'fastify';
import { rolloutDeployment } from '../../../utils/deployment';
import { KubeFastifyInstance, ClusterSettings } from '../../../types';

const juypterhubCfg = 'jupyterhub-cfg';
const segmentKeyCfg = 'odh-segment-key-config';

const DEFAULT_PVC_SIZE = 20;
const DEFAULT_CULLER_TIMEOUT = 31536000; // 1 year as no culling
const DEFAULT_CLUSTER_SETTINGS: ClusterSettings = {
  pvcSize: DEFAULT_PVC_SIZE,
  cullerTimeout: DEFAULT_CULLER_TIMEOUT,
  userTrackingEnabled: null,
};

export const updateClusterSettings = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<{ success: boolean; error: string }> => {
  const coreV1Api = fastify.kube.coreV1Api;
  const namespace = fastify.kube.namespace;
  const query = request.query as { [key: string]: string };
  try {
    if (query.userTrackingEnabled !== 'null') {
      await coreV1Api.patchNamespacedConfigMap(
        segmentKeyCfg,
        namespace,
        {
          data: { segmentKeyEnabled: query.userTrackingEnabled },
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
    const jupyterhubCM = await coreV1Api.readNamespacedConfigMap(juypterhubCfg, namespace);
    if (query.pvcSize && query.cullerTimeout) {
      if (jupyterhubCM.body.data.singleuser_pvc_size.replace('Gi', '') !== query.pvcSize) {
        await rolloutDeployment(fastify, namespace, 'jupyterhub');
      }
      if (jupyterhubCM.body.data['culler_timeout'] !== query.cullerTimeout) {
        await rolloutDeployment(fastify, namespace, 'jupyterhub-idle-culler');
      }
      await coreV1Api.patchNamespacedConfigMap(
        juypterhubCfg,
        namespace,
        {
          data: { singleuser_pvc_size: `${query.pvcSize}Gi`, culler_timeout: query.cullerTimeout },
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
    return { success: true, error: null };
  } catch (e) {
    if (e.response?.statusCode !== 404) {
      fastify.log.error('Setting cluster settings error: ' + e.toString());
      return { success: false, error: 'Unable to update cluster settings. ' + e.message };
    }
  }
};

export const getClusterSettings = async (
  fastify: KubeFastifyInstance,
): Promise<ClusterSettings | string> => {
  const coreV1Api = fastify.kube.coreV1Api;
  const namespace = fastify.kube.namespace;
  const clusterSettings = {
    ...DEFAULT_CLUSTER_SETTINGS,
  };
  try {
    const segmentEnabledRes = await coreV1Api.readNamespacedConfigMap(segmentKeyCfg, namespace);
    clusterSettings.userTrackingEnabled = segmentEnabledRes.body.data.segmentKeyEnabled === 'true';
  } catch (e) {
    fastify.log.error('Error retrieving segment key enabled: ' + e.toString());
  }
  try {
    const jupyterhubCfgResponse = await coreV1Api.readNamespacedConfigMap(juypterhubCfg, namespace);
    clusterSettings.pvcSize = Number(
      jupyterhubCfgResponse.body.data.singleuser_pvc_size.replace('Gi', ''),
    );
    clusterSettings.cullerTimeout = Number(jupyterhubCfgResponse.body.data.culler_timeout);
  } catch (e) {
    fastify.log.error('Error retrieving cluster settings: ' + e.toString());
  }
  return clusterSettings;
};
