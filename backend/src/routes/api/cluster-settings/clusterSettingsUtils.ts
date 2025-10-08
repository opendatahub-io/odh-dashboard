import { FastifyRequest } from 'fastify';
import { V1ConfigMap } from '@kubernetes/client-node';
import { errorHandler, isHttpError } from '../../../utils';
import { rolloutDeployment } from '../../../utils/deployment';
import { KubeFastifyInstance, ClusterSettings } from '../../../types';
import { getDashboardConfig } from '../../../utils/resourceUtils';
import { setDashboardConfig } from '../config/configUtils';
import { checkJupyterEnabled } from '../../../utils/resourceUtils';

const nbcCfg = 'notebook-controller-culler-config';
const segmentKeyCfg = 'odh-segment-key-config';

const DEFAULT_PVC_SIZE = 20;
const DEFAULT_CULLER_TIMEOUT = 31536000; // 1 year as no culling
const DEFAULT_IDLENESS_CHECK_PERIOD = '1'; // 1 minute
const DEFAULT_CLUSTER_SETTINGS = {
  pvcSize: DEFAULT_PVC_SIZE,
  cullerTimeout: DEFAULT_CULLER_TIMEOUT,
  userTrackingEnabled: false,
  modelServingPlatformEnabled: {
    kServe: true,
    modelMesh: false,
  },
} satisfies ClusterSettings;

export const updateClusterSettings = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest<{
    Body: ClusterSettings;
  }>,
): Promise<{ success: boolean; error: string }> => {
  const { coreV1Api } = fastify.kube;
  const { namespace } = fastify.kube;
  const { pvcSize, cullerTimeout, userTrackingEnabled, modelServingPlatformEnabled } = request.body;
  const dashConfig = getDashboardConfig(request);
  const isJupyterEnabled = checkJupyterEnabled();
  try {
    if (
      modelServingPlatformEnabled.kServe !== !dashConfig.spec.dashboardConfig.disableKServe ||
      modelServingPlatformEnabled.modelMesh !== !dashConfig.spec.dashboardConfig.disableModelMesh
    ) {
      await setDashboardConfig(fastify, {
        spec: {
          dashboardConfig: {
            disableKServe: !modelServingPlatformEnabled.kServe,
            disableModelMesh: !modelServingPlatformEnabled.modelMesh,
          },
        },
      });
    }

    await patchCM(fastify, segmentKeyCfg, {
      data: { segmentKeyEnabled: String(userTrackingEnabled) },
    }).catch((e) => {
      fastify.log.error(`Failed to update segment key enabled: ${e.message}`);
    });
    if (pvcSize && cullerTimeout) {
      await setDashboardConfig(fastify, {
        spec: {
          notebookController: {
            enabled: isJupyterEnabled,
            pvcSize: `${pvcSize}Gi`,
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
          fastify.log.error(`Failed to delete culler config: ${e.message}`);
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
                labels: {
                  'opendatahub.io/dashboard': 'true',
                },
              },
              data: {
                ENABLE_CULLING: String(isEnabled),
                CULL_IDLE_TIME: String(cullingTimeMin), // In minutes
                IDLENESS_CHECK_PERIOD: DEFAULT_IDLENESS_CHECK_PERIOD, //In minutes
              },
            };
            await fastify.kube.coreV1Api.createNamespacedConfigMap(fastify.kube.namespace, cm);
          } else {
            fastify.log.error(`Failed to patch culler config: ${e.message}`);
          }
        });
      }
    }
    await rolloutDeployment(fastify, namespace, 'notebook-controller-deployment');
    return { success: true, error: '' };
  } catch (e) {
    fastify.log.error(e, `Setting cluster settings error: ${errorHandler(e)}`);
    if (!isHttpError(e) || e.response.statusCode !== 404) {
      return { success: false, error: `Unable to update cluster settings. ${errorHandler(e)}` };
    }
    throw e;
  }
};

export const getClusterSettings = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<ClusterSettings | string> => {
  const { coreV1Api } = fastify.kube;
  const { namespace } = fastify.kube;
  const dashConfig = getDashboardConfig(request);
  const clusterSettings: ClusterSettings = {
    ...DEFAULT_CLUSTER_SETTINGS,
    modelServingPlatformEnabled: {
      kServe: !dashConfig.spec.dashboardConfig.disableKServe,
      modelMesh: !dashConfig.spec.dashboardConfig.disableModelMesh,
    },
  };

  if (!dashConfig.spec.dashboardConfig.disableTracking) {
    try {
      const segmentEnabledRes = await coreV1Api.readNamespacedConfigMap(segmentKeyCfg, namespace);
      clusterSettings.userTrackingEnabled =
        segmentEnabledRes.body.data?.segmentKeyEnabled === 'true';
    } catch (e) {
      fastify.log.error(e, 'Error retrieving segment key enabled.');
    }
  }

  clusterSettings.pvcSize = DEFAULT_PVC_SIZE;
  if (dashConfig.spec.notebookController?.pvcSize) {
    clusterSettings.pvcSize = Number(dashConfig.spec.notebookController.pvcSize.replace('Gi', ''));
  }
  clusterSettings.cullerTimeout = DEFAULT_CULLER_TIMEOUT;
  await fastify.kube.coreV1Api
    .readNamespacedConfigMap(nbcCfg, fastify.kube.namespace)
    .then((res) => {
      const cullerTimeout = res.body.data?.CULL_IDLE_TIME;
      const isEnabled = Boolean(res.body.data?.ENABLE_CULLING);
      if (isEnabled) {
        clusterSettings.cullerTimeout = Number(cullerTimeout) * 60; //minutes to seconds;
      }
    })
    .catch((e) => {
      if (e.statusCode === 404) {
        fastify.log.warn('Notebook controller culling config not found, culling disabled...');
      } else {
        fastify.log.error(e, 'Error getting notebook controller culling settings.');
        throw e;
      }
    });

  return clusterSettings;
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
