const createError = require('http-errors');
const fs = require('fs');
const path = require('path');
const jsYaml = require('js-yaml');
const constants = require('../../../utils/constants');

const getServices = async (fastify) => {
  const coreV1Api = fastify.kube.coreV1Api;

  try {
    const res = await coreV1Api.listServiceForAllNamespaces();
    return res?.body?.items;
  } catch (e) {
    fastify.log.error(e, 'failed to get Services');
    return [];
  }
};

const getURLForRoute = (route, routeSuffix) => {
  const host = route?.spec?.host;
  if (!host) {
    return null;
  }
  const tlsTerm = route.spec.tls?.termination;
  const protocol = tlsTerm ? 'https' : 'http';
  const suffix = routeSuffix ? `/${routeSuffix}` : '';
  return `${protocol}://${host}${suffix}`;
};

const getLink = async (fastify, routeName, namespace, routeSuffix) => {
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
    return getURLForRoute(res?.body, routeSuffix);
  } catch (e) {
    fastify.log.error(`failed to get route ${routeName} in namespace ${namespace}`);
    return null;
  }
};

const getServiceLink = async (fastify, services, serviceName, routeSuffix) => {
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
    return getURLForRoute(res?.body?.items?.[0], routeSuffix);
  } catch (e) {
    fastify.log.error(`failed to get route in namespace ${namespace}`);
    return null;
  }
};

const getInstalledKfdefs = async (fastify) => {
  const customObjectsApi = fastify.kube.customObjectsApi;
  const namespace = fastify.kube.namespace;

  let kfdef;
  try {
    const res = await customObjectsApi.listNamespacedCustomObject(
      'kfdef.apps.kubeflow.org',
      'v1',
      namespace,
      'kfdefs',
    );
    kfdef = res?.body?.items?.[0];
  } catch (e) {
    fastify.log.error(e, 'failed to get kfdefs');
    const error = createError(500, 'failed to get kfdefs');
    error.explicitInternalServerError = true;
    error.error = 'failed to get kfdefs';
    error.message =
      'Unable to load Kubeflow resources. Please ensure the Open Data Hub operator has been installed.';
    throw error;
  }

  return kfdef?.spec?.applications || [];
};

const getInstalledOperators = async (fastify) => {
  const customObjectsApi = fastify.kube.customObjectsApi;

  let csvs = [];
  try {
    const res = await customObjectsApi.listNamespacedCustomObject(
      'operators.coreos.com',
      'v1alpha1',
      '',
      'clusterserviceversions',
    );
    csvs = res?.body?.items;
  } catch (e) {
    fastify.log.error(e, 'failed to get ClusterServiceVersions');
    csvs = [];
  }

  return csvs.reduce((acc, csv) => {
    if (csv.status?.phase === 'Succeeded' && csv.status?.reason === 'InstallSucceeded') {
      acc.push(csv);
    }
    return acc;
  }, []);
};

const getApplicationEnabledConfigMap = (fastify, appDef) => {
  const namespace = fastify.kube.namespace;
  const name = appDef.spec.enable?.validationConfigMap;
  if (!name) {
    Promise.resolve(null);
  }
  const coreV1Api = fastify.kube.coreV1Api;
  return coreV1Api
    .readNamespacedConfigMap(name, namespace)
    .then((result) => result.body)
    .catch((res) => {
      fastify.log.error(
        `Failed to read config map ${name} for ${appDef.metadata.name}: ${res.response?.body?.message}`,
      );
      Promise.resolve(null);
    });
};

const getEnabledConfigMaps = (fastify, appDefs) => {
  const configMapGetters = appDefs.reduce((acc, app) => {
    if (app.spec.enable) {
      acc.push(getApplicationEnabledConfigMap(fastify, app));
    }
    return acc;
  }, []);
  return Promise.all(configMapGetters);
};

const getApplicationDefs = () => {
  const normalizedPath = path.join(__dirname, '../../../../data/applications');
  const applicationDefs = [];
  fs.readdirSync(normalizedPath).forEach((file) => {
    if (constants.yamlRegExp.test(file)) {
      try {
        const doc = jsYaml.load(fs.readFileSync(path.join(normalizedPath, file), 'utf8'));
        applicationDefs.push(doc);
      } catch (e) {
        console.error(`Error loading application definition ${file}: ${e}`);
      }
    }
  });
  return applicationDefs;
};

module.exports = {
  getInstalledKfdefs,
  getInstalledOperators,
  getServices,
  getLink,
  getServiceLink,
  getApplicationEnabledConfigMap,
  getEnabledConfigMaps,
  getApplicationDefs,
};
