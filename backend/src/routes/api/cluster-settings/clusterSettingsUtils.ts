import { FastifyRequest } from 'fastify';
import { rolloutDeploymentConfig, rolloutDeployment } from '../../../utils/deployment';
import { KubeFastifyInstance, ClusterSettings } from '../../../types';
import { getDashboardConfig } from '../../../utils/resourceUtils';
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
  const dashConfig = getDashboardConfig();
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
      if (dashConfig.spec?.notebookController?.enabled) {
        let isEnabled = true;
        const cullingTimeMin = Number(query.cullerTimeout) / 60; // Seconds to minutes
        if (Number(query.cullerTimeout) === DEFAULT_CULLER_TIMEOUT) {
          isEnabled = false;
        }
        await coreV1Api.patchNamespacedConfigMap(
          'notebook-controller-culler-config',
          namespace,
          {
            data: { ENABLE_CULLING: String(isEnabled), CULL_IDLE_TIME: String(cullingTimeMin) },
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
      } else {
        await coreV1Api.patchNamespacedConfigMap(
          juypterhubCfg,
          namespace,
          {
            data: {
              singleuser_pvc_size: `${query.pvcSize}Gi`,
              culler_timeout: query.cullerTimeout,
            },
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
    }
    if (jupyterhubCM.body.data.singleuser_pvc_size.replace('Gi', '') !== query.pvcSize) {
      await rolloutDeploymentConfig(fastify, namespace, 'jupyterhub');
    }
    if (jupyterhubCM.body.data['culler_timeout'] !== query.cullerTimeout) {
      if (dashConfig.spec.notebookController.enabled) {
        await rolloutDeployment(fastify, namespace, 'notebook-controller-deployment');
      } else {
        await rolloutDeploymentConfig(fastify, namespace, 'jupyterhub-idle-culler');
      }
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
  const dashConfig = getDashboardConfig();
  try {
    const segmentEnabledRes = await coreV1Api.readNamespacedConfigMap(segmentKeyCfg, namespace);
    clusterSettings.userTrackingEnabled = segmentEnabledRes.body.data.segmentKeyEnabled === 'true';
  } catch (e) {
    fastify.log.error('Error retrieving segment key enabled: ' + e.toString());
  }
  if (dashConfig.spec?.notebookController?.enabled) {
    try {
      const nbcCfgResponse = await fastify.kube.coreV1Api.readNamespacedConfigMap(
        'notebook-controller-culler-config',
        fastify.kube.namespace,
      );
      const cullerTimeout = nbcCfgResponse.body.data['CULL_IDLE_TIME'];
      const isEnabled = Boolean(nbcCfgResponse.body.data['ENABLE_CULLING']);
      if (isEnabled) {
        clusterSettings.cullerTimeout = Number(cullerTimeout) * 60; //minutes to seconds;
      } else {
        clusterSettings.cullerTimeout = DEFAULT_CULLER_TIMEOUT;
      }
      clusterSettings.pvcSize = 20; //PLACEHOLDER
    } catch (e) {
      fastify.log.error('Error notebook controller culling settings: ' + e.toString());
    }
  } else {
    try {
      let pvcSize, cullerTimeout;
      [pvcSize, cullerTimeout] = await readJupyterhubCfg(fastify);
      clusterSettings.pvcSize = pvcSize;
      clusterSettings.cullerTimeout = cullerTimeout;
    } catch (e) {
      fastify.log.error('Error retrieving cluster settings: ' + e.toString());
    }
  }

  return clusterSettings;
};

const readJupyterhubCfg = async (fastify: KubeFastifyInstance): Promise<[number, number]> => {
  const jupyterhubCfgResponse = await fastify.kube.coreV1Api.readNamespacedConfigMap(
    juypterhubCfg,
    fastify.kube.namespace,
  );
  const pvcSize = Number(jupyterhubCfgResponse.body.data.singleuser_pvc_size.replace('Gi', ''));
  const cullerTimeout = Number(jupyterhubCfgResponse.body.data.culler_timeout);
  return [pvcSize, cullerTimeout];
};
