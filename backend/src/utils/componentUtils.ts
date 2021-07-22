import { IncomingMessage } from 'http';
import { V1ConfigMap } from '@kubernetes/client-node/dist/gen/model/v1ConfigMap';
import { OdhApplication, K8sResourceCommon, KubeFastifyInstance, RouteKind } from '../types';
import { getConsoleLinks, getServices } from './resourceUtils';

type RoutesResponse = {
  body: {
    items: RouteKind[];
  };
  response: IncomingMessage;
};

export const getRouteForClusterId = (fastify: KubeFastifyInstance, route: string): string =>
  route ? route.replace('<CLUSTER_ID/>', fastify.kube.clusterID) : route;

const getEndPointForApp = (fastify: KubeFastifyInstance, app: OdhApplication): string => {
  if (!app.spec.endpoint) {
    return null;
  }
  return getRouteForClusterId(fastify, app.spec.endpoint);
};

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
  if (!routeName) {
    return null;
  }
  try {
    const route = await customObjectsApi
      .getNamespacedCustomObject('route.openshift.io', 'v1', routeNamespace, 'routes', routeName)
      .then((res) => res.body as RouteKind);
    return getURLForRoute(route, routeSuffix);
  } catch (e) {
    fastify.log.error(`failed to get route ${routeName} in namespace ${namespace}`);
    return null;
  }
};

export const getConsoleLinkRoute = (appDef: OdhApplication): string => {
  if (!appDef.spec.consoleLink) {
    return null;
  }
  const consoleLinks = getConsoleLinks();
  const consoleLink = consoleLinks.find((cl) => cl.metadata.name === appDef.spec.consoleLink);
  return consoleLink ? consoleLink.spec.href : null;
};

export const getServiceLink = async (
  fastify: KubeFastifyInstance,
  serviceName: string,
  routeSuffix: string,
): Promise<string> => {
  if (!serviceName) {
    return null;
  }
  const services = getServices();
  const service = services.find((service) => service.metadata.name === serviceName);
  if (!service) {
    return null;
  }

  const customObjectsApi = fastify.kube.customObjectsApi;
  const { namespace } = service.metadata;
  try {
    const routes = await customObjectsApi
      .listNamespacedCustomObject('route.openshift.io', 'v1', namespace, 'routes')
      .then((res: RoutesResponse) => res?.body?.items);
    return getURLForRoute(routes?.[0], routeSuffix);
  } catch (e) {
    fastify.log.error(`failed to get route in namespace ${namespace}`);
    return null;
  }
};

export const getRouteForApplication = async (
  fastify: KubeFastifyInstance,
  app: OdhApplication,
  operatorCSV?: K8sResourceCommon,
): Promise<string> => {
  // Check for an Endpoint
  let route = getEndPointForApp(fastify, app);
  if (route) {
    return route;
  }

  // Check for CSV route
  route = await getLink(
    fastify,
    app.spec.route,
    app.spec.routeNamespace || operatorCSV?.metadata.namespace,
    app.spec.routeSuffix,
  );
  if (route) {
    return route;
  }

  // Check for specified route
  route = await getLink(fastify, app.spec.route);
  if (route) {
    return route;
  }

  // Check for console link
  route = await getConsoleLinkRoute(app);
  if (route) {
    return route;
  }

  // Check for service based route
  route = await getServiceLink(fastify, app.spec.serviceName, app.spec.routeSuffix);

  return route;
};

export const getApplicationEnabledConfigMap = (
  fastify: KubeFastifyInstance,
  appDef: OdhApplication,
): Promise<V1ConfigMap> => {
  const namespace = fastify.kube.namespace;
  const name = appDef.spec.enable?.validationConfigMap;
  if (!name) {
    return Promise.resolve(null);
  }
  const coreV1Api = fastify.kube.coreV1Api;
  return coreV1Api
    .readNamespacedConfigMap(name, namespace)
    .then((result) => result.body)
    .catch(() => null);
};

export const getEnabledConfigMaps = (
  fastify: KubeFastifyInstance,
  appDefs: OdhApplication[],
): Promise<V1ConfigMap[]> => {
  const configMapGetters = appDefs.reduce((acc, app) => {
    if (app.spec.enable) {
      acc.push(getApplicationEnabledConfigMap(fastify, app));
    }
    return acc;
  }, []);
  return Promise.all(configMapGetters);
};
