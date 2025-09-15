import { IncomingMessage } from 'http';
import {
  OdhApplication,
  K8sResourceCommon,
  KubeFastifyInstance,
  RouteKind,
  CSVKind,
} from '../types';
import { getConsoleLinks, getDashboardConfig, getSubscriptions } from './resourceUtils';
import { isHttpError } from '../utils';

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
    fastify.log.info(`failed to get route ${routeName} in namespace ${namespace}`);
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

export const getRouteForApplication = async (
  fastify: KubeFastifyInstance,
  app: OdhApplication,
): Promise<string> => {
  // Check for an Endpoint
  let route = getEndPointForApp(fastify, app);
  if (route) {
    return route;
  }

  // Check for specified route
  route = await getLink(fastify, app.spec.route);
  if (route) {
    return route;
  }

  const operatorCSV = await getCSVForApp(fastify, app);
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

  // Check for console link
  route = getConsoleLinkRoute(app);
  if (route) {
    return route;
  }

  // Check for service based route
  route = await getServiceLink(fastify, app.spec.serviceName, app.spec.routeSuffix);

  return route;
};

export const getApplicationEnabledConfigMap = async (
  fastify: KubeFastifyInstance,
  appDef: OdhApplication,
): Promise<boolean> => {
  const namespace = fastify.kube.namespace;
  const name = appDef.spec.enable?.validationConfigMap;
  if (!name) {
    return Promise.resolve(null);
  }
  const coreV1Api = fastify.kube.coreV1Api;
  const enabledCM = await coreV1Api
    .readNamespacedConfigMap(name, namespace)
    .then((result) => result.body)
    .catch(() => null);
  if (!enabledCM) {
    return false;
  }
  return enabledCM.data?.validation_result === 'true';
};

const getCSVForApp = (
  fastify: KubeFastifyInstance,
  app: OdhApplication,
): Promise<K8sResourceCommon | undefined> => {
  if (!app.spec.csvName) {
    return Promise.resolve(undefined);
  }

  const subsStatus = getSubscriptions();
  const subStatus = subsStatus.find((st) => st.installedCSV?.startsWith(app.spec.csvName));

  if (!subStatus) {
    return Promise.resolve(undefined);
  }

  const installedCSV = subStatus.installedCSV;

  if (!installedCSV) {
    return Promise.resolve(undefined);
  }

  const namespace = subStatus.installPlanRefNamespace;
  if (!namespace) {
    return Promise.resolve(undefined);
  }

  return fastify.kube.customObjectsApi
    .getNamespacedCustomObject(
      'operators.coreos.com',
      'v1alpha1',
      namespace,
      'clusterserviceversions',
      installedCSV,
    )
    .then((response) => {
      const csv = response.body as CSVKind;
      if (csv.status?.phase === 'Succeeded') {
        return csv;
      }
      return undefined;
    })
    .catch((e) => {
      if (isHttpError(e) && e.statusCode === 404) {
        fastify.log.error(e);
        return undefined;
      }
      throw e;
    });
};

const getField = (obj: any, path: string, defaultValue: string = undefined): string => {
  const travel = (regexp: RegExp) =>
    String.prototype.split
      .call(path, regexp)
      .filter(Boolean)
      .reduce((res: any, key: string) => (res !== null && res !== undefined ? res[key] : res), obj);
  const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
  return result === undefined || result === obj ? defaultValue : result;
};

const getCREnabledForApp = (
  fastify: KubeFastifyInstance,
  appDef: OdhApplication,
): Promise<boolean> => {
  const { enableCR } = appDef.spec;
  if (!enableCR) {
    return undefined;
  }

  const customObjectsApi = fastify.kube.customObjectsApi;
  const namespace = enableCR.namespace || fastify.kube.namespace;
  const { group, version, plural, name } = enableCR;
  return customObjectsApi
    .getNamespacedCustomObject(group, version, namespace, plural, name)
    .then((res) => {
      const existingCR = res.body;
      if (!enableCR) {
        return false;
      }
      return getField(existingCR, appDef.spec.enableCR.field) === appDef.spec.enableCR.value;
    })
    .catch(() => false);
};

export const getIsAppEnabled = async (
  fastify: KubeFastifyInstance,
  appDef: OdhApplication,
): Promise<boolean> => {
  if (appDef.spec.category === 'Red Hat managed') {
    return true;
  }

  const enabledCM = await getApplicationEnabledConfigMap(fastify, appDef);
  if (enabledCM) {
    return true;
  }
  const crEnabled = await getCREnabledForApp(fastify, appDef);
  if (crEnabled) {
    return true;
  }

  if (await getCSVForApp(fastify, appDef)) {
    return true;
  }

  // Failed all checks
  return false;
};

export const convertLabelsToString = (labels: { [key: string]: string }): string => {
  let outputString = '';
  for (const key in labels) {
    outputString = outputString.concat(key, '=', labels[key], ' ');
  }
  return outputString;
};

export const checkJupyterEnabled = (): boolean =>
  getDashboardConfig().spec.notebookController?.enabled !== false;
