import { FastifyRequest } from 'fastify';
import { KubeFastifyInstance, OdhApplication } from '../../../types';
import { getRouteForApplication } from '../../../utils/componentUtils';
import { getApplicationDefs, updateApplicationDefs } from '../../../utils/resourceUtils';

export const listComponents = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<OdhApplication[]> => {
  const applicationDefs = getApplicationDefs();
  const installedComponents = [];
  const query = request.query as { [key: string]: string };

  if (!query.installed) {
    return await Promise.all(applicationDefs);
  }

  for (const appDef of applicationDefs) {
    if (appDef.spec.shownOnEnabledPage) {
      const app = {
        ...appDef,
        spec: {
          ...appDef.spec,
          link: await getRouteForApplication(fastify, appDef),
        },
      };
      installedComponents.push(app);
    }
  }

  return installedComponents;
};

export const removeComponent = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<{ success: boolean; error: string }> => {
  const query = request.query as { [key: string]: string };
  const coreV1Api = fastify.kube.coreV1Api;
  const enabledAppsConfigMapName = process.env.ENABLED_APPS_CM;
  const namespace = fastify.kube.namespace;
  try {
    const enabledAppsCM = await coreV1Api
      .readNamespacedConfigMap(enabledAppsConfigMapName, namespace)
      .then((result) => result.body)
      .catch(() => {
        throw new Error('Error fetching applications shown on enabled page');
      });
    const enabledAppsCMData = enabledAppsCM.data;
    delete enabledAppsCMData[query.appName];
    const cmBody = {
      metadata: {
        name: enabledAppsConfigMapName,
        namespace: namespace,
      },
      data: enabledAppsCMData,
    };
    await coreV1Api.replaceNamespacedConfigMap(enabledAppsConfigMapName, namespace, cmBody);
    await updateApplicationDefs();
    return { success: true, error: null };
  } catch (e) {
    fastify.log.error(e.message);
    return { success: false, error: e.message };
  }
};
