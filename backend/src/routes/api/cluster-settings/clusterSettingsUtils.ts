import { FastifyRequest } from 'fastify';
import { rolloutDeploymentConfig, rolloutDeployment } from '../../../utils/deployment';
import { KubeFastifyInstance, ClusterSettings } from '../../../types';
import { getDashboardConfig } from '../../../utils/resourceUtils';
import { V1ConfigMap } from '@kubernetes/client-node';
import { setDashboardConfig } from '../config/configUtils';
const jupyterhubCfg = 'jupyterhub-cfg';
const nbcCfg = 'notebook-controller-culler-config';
const segmentKeyCfg = 'odh-segment-key-config';

const DEFAULT_PVC_SIZE = 20;
const DEFAULT_CULLER_TIMEOUT = 31536000; // 1 year as no culling
const DEFAULT_IDLENESS_CHECK_PERIOD = '1'; // 1 minute
const DEFAULT_CLUSTER_SETTINGS: ClusterSettings = {
  pvcSize: DEFAULT_PVC_SIZE,
  cullerTimeout: DEFAULT_CULLER_TIMEOUT,
  userTrackingEnabled: false,
  notebookTolerationSettings: { enabled: false, key: 'NotebooksOnly' },
};

export const updateClusterSettings = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest<{
    Body: ClusterSettings;
  }>,
): Promise<{ success: boolean; error: string }> => {
  const coreV1Api = fastify.kube.coreV1Api;
  const namespace = fastify.kube.namespace;
  const { pvcSize, cullerTimeout, userTrackingEnabled, notebookTolerationSettings } = request.body;
  const dashConfig = getDashboardConfig();
  try {
    await patchCM(fastify, segmentKeyCfg, {
      data: { segmentKeyEnabled: String(userTrackingEnabled) },
    }).catch((e) => {
      fastify.log.error('Failed to update segment key enabled: ' + e.message);
    });
    if (pvcSize && cullerTimeout) {
      if (dashConfig.spec?.notebookController?.enabled) {
        await setDashboardConfig(fastify, {
          spec: {
            dashboardConfig: dashConfig.spec.dashboardConfig,
            notebookController: {
              enabled: dashConfig.spec.notebookController.enabled,
              pvcSize: `${pvcSize}Gi`,
              notebookTolerationSettings: {
                enabled: notebookTolerationSettings.enabled,
                key: notebookTolerationSettings.key,
              },
            },
          },
        });
        let isEnabled = true;
        const cullingTimeMin = Number(cullerTimeout) / 60; // Seconds to minutes
        if (Number(cullerTimeout) === DEFAULT_CULLER_TIMEOUT) {
          isEnabled = false;
        }
        if (!isEnabled) {
          await coreV1Api.deleteNamespacedConfigMap(nbcCfg, fastify.kube.namespace).catch((e) => {
            fastify.log.error('Failed to delete culler config: ') + e.message;
          });
        } else {
          await patchCM(fastify, nbcCfg, {
            data: { ENABLE_CULLING: String(isEnabled), CULL_IDLE_TIME: String(cullingTimeMin) },
          }).catch(async (e) => {
            if (e.statusCode === 404) {
              const cm: V1ConfigMap = {
                apiVersion: 'v1',
                kind: 'ConfigMap',
                metadata: {
                  name: 'notebook-controller-culler-config',
                },
                data: {
                  ENABLE_CULLING: String(isEnabled),
                  CULL_IDLE_TIME: String(cullingTimeMin), // In minutes
                  IDLENESS_CHECK_PERIOD: DEFAULT_IDLENESS_CHECK_PERIOD, //In minutes
                },
              };
              await fastify.kube.coreV1Api.createNamespacedConfigMap(fastify.kube.namespace, cm);
            } else {
              fastify.log.error('Failed to patch culler config: ' + e.message);
            }
          });
        }
      } else {
        patchCM(fastify, jupyterhubCfg, {
          data: {
            singleuser_pvc_size: `${pvcSize}Gi`,
            culler_timeout: String(cullerTimeout),
          },
        }).catch((e) => {
          fastify.log.error('Unable to patch JupyterHub config' + e.message);
        });
      }
    }
    if (dashConfig.spec.notebookController?.enabled) {
      await rolloutDeployment(fastify, namespace, 'notebook-controller-deployment');
    } else {
      const jupyterhubCM = await coreV1Api.readNamespacedConfigMap(jupyterhubCfg, namespace);
      if (jupyterhubCM.body.data.singleuser_pvc_size.replace('Gi', '') !== String(pvcSize)) {
        await rolloutDeploymentConfig(fastify, namespace, 'jupyterhub');
      }
      if (jupyterhubCM.body.data['culler_timeout'] !== String(cullerTimeout)) {
        await rolloutDeploymentConfig(fastify, namespace, 'jupyterhub-idle-culler');
      }
    }
    return { success: true, error: null };
  } catch (e) {
    fastify.log.error(
      'Setting cluster settings error: ' + e.toString() + e.response?.body?.message,
    );
    if (e.response?.statusCode !== 404) {
      return { success: false, error: 'Unable to update cluster settings. ' + e.message };
    }
    throw e;
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
    clusterSettings.pvcSize = DEFAULT_PVC_SIZE;
    if (dashConfig.spec.notebookController.pvcSize) {
      clusterSettings.pvcSize = Number(
        dashConfig.spec.notebookController.pvcSize.replace('Gi', ''),
      );
    }
    clusterSettings.notebookTolerationSettings =
      dashConfig.spec.notebookController.notebookTolerationSettings;
    clusterSettings.cullerTimeout = DEFAULT_CULLER_TIMEOUT; // For backwards compatibility with jupyterhub and less changes to UI
    await fastify.kube.coreV1Api
      .readNamespacedConfigMap(nbcCfg, fastify.kube.namespace)
      .then((res) => {
        const cullerTimeout = res.body.data['CULL_IDLE_TIME'];
        const isEnabled = Boolean(res.body.data['ENABLE_CULLING']);
        if (isEnabled) {
          clusterSettings.cullerTimeout = Number(cullerTimeout) * 60; //minutes to seconds;
        }
      })
      .catch((e) => {
        if (e.statusCode === 404) {
          fastify.log.warn('Notebook controller culling config not found, culling disabled...');
        } else {
          fastify.log.error('Error getting notebook controller culling settings: ' + e.toString());
          throw e;
        }
      });
  } else {
    try {
      const [pvcSize, cullerTimeout] = await readJupyterhubCfg(fastify);
      clusterSettings.pvcSize = pvcSize;
      clusterSettings.cullerTimeout = cullerTimeout;
    } catch (e) {
      fastify.log.error('Error retrieving cluster settings: ' + e.toString());
    }
  }

  return clusterSettings;
};

const readJupyterhubCfg = async (fastify: KubeFastifyInstance): Promise<[number, number]> => {
  const jupyterhubCfgResponse = await fastify.kube.coreV1Api
    .readNamespacedConfigMap(jupyterhubCfg, fastify.kube.namespace)
    .then((response) => response.body);
  const pvcSize = Number(jupyterhubCfgResponse.data.singleuser_pvc_size.replace('Gi', ''));
  const cullerTimeout = Number(jupyterhubCfgResponse.data.culler_timeout);
  return [pvcSize, cullerTimeout];
};

const patchCM = async (
  fastify: KubeFastifyInstance,
  name: string,
  patch: Partial<V1ConfigMap>,
): Promise<V1ConfigMap> => {
  const response = await fastify.kube.coreV1Api.patchNamespacedConfigMap(
    name,
    fastify.kube.namespace,
    patch,
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
  return response.body;
};
