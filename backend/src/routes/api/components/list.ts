import { FastifyRequest } from 'fastify';
import { KubeFastifyInstance, OdhApplication } from '../../../types';
import { getApplications } from '../../../utils/resourceUtils';

export const listComponents = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<OdhApplication[]> => {
  const applications = await getApplications();
  const query = request.query as { [key: string]: string };

  if (query.installed) {
    return Promise.resolve(applications.filter((app) => app.spec.isEnabled));
  }
  return Promise.resolve(applications);
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
