import { IncomingMessage } from 'http';
import { KubeFastifyInstance, RouteKind } from '../types';

type RoutesResponse = {
  body: {
    items: RouteKind[];
  };
  response: IncomingMessage;
};

export const getRouteForClusterId = (fastify: KubeFastifyInstance, route: string): string =>
  route ? route.replace('<CLUSTER_ID/>', fastify.kube.clusterID) : route;

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
    fastify.log.info(`failed to get route ${routeName} in namespace ${namespace}`);
    return null;
  }
};

export const getServiceLink = async (
  fastify: KubeFastifyInstance,
  serviceName: string,
  routeSuffix: string,
): Promise<string> => {
  if (!serviceName) {
    return null;
  }
  const res = await fastify.kube.coreV1Api.listServiceForAllNamespaces(
    undefined,
    undefined,
    `metadata.name=${serviceName}`,
  );
  const service = res?.body.items?.[0];
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
    fastify.log.info(`failed to get route in namespace ${namespace}`);
    return null;
  }
};

export const convertLabelsToString = (labels: { [key: string]: string }): string => {
  let outputString = '';
  for (const key in labels) {
    outputString = outputString.concat(key, '=', labels[key], ' ');
  }
  return outputString;
};
