import { V1ConfigMap } from '@kubernetes/client-node/dist/gen/model/v1ConfigMap';
import { ODHApp, K8sResourceCommon, KubeFastifyInstance, RouteKind } from '../types';

const getURLForRoute = (route: RouteKind, routeSuffix: string): string => {
  const host = route?.spec?.host;
  if (!host) {
    return null;
  }
  const tlsTerm = route.spec.tls?.termination;
  const protocol = tlsTerm ? 'https' : 'http';
  const suffix = routeSuffix ? `/${routeSuffix}` : '';
  return `${protocol}://${host}${suffix}`;
};

export const getLink = async (
  fastify: KubeFastifyInstance,
  routeName: string,
  namespace?: string,
  routeSuffix?: string,
): Promise<string> => {
  const customObjectsApi = fastify.kube.customObjectsApi;
  const routeNamespace = namespace || fastify.kube.namespace;
  try {
    const res = await customObjectsApi.getNamespacedCustomObject(
      'route.openshift.io',
      'v1',
      routeNamespace,
      'routes',
      routeName,
    );
    return getURLForRoute(res?.body as RouteKind, routeSuffix);
  } catch (e) {
    fastify.log.error(`failed to get route ${routeName} in namespace ${namespace}`);
    return null;
  }
};

export const getServiceLink = async (
  fastify: KubeFastifyInstance,
  services: K8sResourceCommon[],
  serviceName: string,
  routeSuffix: string,
): Promise<string> => {
  if (!services?.length || !serviceName) {
    return null;
  }
  const service = services.find((service) => service.metadata.name === serviceName);
  if (!service) {
    return null;
  }

  const customObjectsApi = fastify.kube.customObjectsApi;
  const { namespace } = service.metadata;
  try {
    const res = await customObjectsApi.listNamespacedCustomObject(
      'route.openshift.io',
      'v1',
      namespace,
      'routes',
    );
    return getURLForRoute((res?.body as { items: RouteKind[] })?.items?.[0], routeSuffix);
  } catch (e) {
    fastify.log.error(`failed to get route in namespace ${namespace}`);
    return null;
  }
};

export const getApplicationEnabledConfigMap = (
  fastify: KubeFastifyInstance,
  appDef: ODHApp,
): Promise<V1ConfigMap> => {
  const namespace = fastify.kube.namespace;
  const name = appDef.spec.enable?.validationConfigMap;
  if (!name) {
    return Promise.resolve(null);
  }
  const coreV1Api = fastify.kube.coreV1Api;
  return coreV1Api
    .readNamespacedConfigMap(name, namespace)
    .then((result: { body: V1ConfigMap }) => result.body)
    .catch(() => null);
};

export const getEnabledConfigMaps = (
  fastify: KubeFastifyInstance,
  appDefs: ODHApp[],
): Promise<V1ConfigMap[]> => {
  const configMapGetters = appDefs.reduce((acc, app) => {
    if (app.spec.enable) {
      acc.push(getApplicationEnabledConfigMap(fastify, app));
    }
    return acc;
  }, []);
  return Promise.all(configMapGetters);
};
