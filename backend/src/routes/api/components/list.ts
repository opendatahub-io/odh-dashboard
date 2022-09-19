import { FastifyRequest } from 'fastify';
import { KubeFastifyInstance, OdhApplication } from '../../../types';
import { getApplications, updateApplications } from '../../../utils/resourceUtils';
import { checkJupyterEnabled, getRouteForApplication } from '../../../utils/componentUtils';

export const listComponents = async (
  fastify: KubeFastifyInstance,
  request: FastifyRequest,
): Promise<OdhApplication[]> => {
  const applications = getApplications().filter(
    (component) => component.metadata.name !== (checkJupyterEnabled() ? 'jupyterhub' : 'jupyter'),
  );
  const query = request.query as { [key: string]: string };
  const installedComponents = [];

  if (!query.installed) {
    return Promise.resolve(applications);
  }
  for (const app of applications) {
    if (app.spec.shownOnEnabledPage) {
      const newApp = {
        ...app,
        spec: {
          ...app.spec,
          link: await getRouteForApplication(fastify, app),
        },
      };
      installedComponents.push(newApp);
    }
  }
  return Promise.resolve(installedComponents);
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
    await updateApplications();
    return { success: true, error: null };
  } catch (e) {
    fastify.log.error(e.message);
    return { success: false, error: e.message };
  }
};
