const _ = require('lodash');
const createError = require('http-errors');
const fs = require('fs');
const path = require('path');
const jsYaml = require('js-yaml');
const constants = require('../../../utils/constants');

const getLink = async (fastify, routeName, namespace) => {
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
    const host = _.get(res, 'body.spec.host');
    const tlsTerm = _.get(res, 'body.spec.tls.termination');
    const protocol = tlsTerm ? 'https' : 'http';
    return `${protocol}://${host}`;
  } catch (e) {
    fastify.log.error(e, `failed to get route ${routeName}`);
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
    kfdef = _.get(res, 'body.items[0]');
  } catch (e) {
    fastify.log.error(e, 'failed to get kfdefs');
    const error = createError(500, 'failed to get kfdefs');
    error.explicitInternalServerError = true;
    error.error = 'failed to get kfdefs';
    error.message =
      'Unable to load Kubeflow resources. Please ensure the Open Data Hub operator has been installed.';
    throw error;
  }

  return _.get(kfdef, 'spec.applications') || [];
};

const getInstalledOperators = async (fastify) => {
  const customObjectsApi = fastify.kube.customObjectsApi;

  let csvs;
  try {
    const res = await customObjectsApi.listNamespacedCustomObject(
      'operators.coreos.com',
      'v1alpha1',
      '',
      'clusterserviceversions',
    );
    csvs = _.get(res, 'body.items');
  } catch (e) {
    fastify.log.error(e, 'failed to get ClusterServiceVersions');
    const error = createError(500, 'failed to get ClusterServiceVersions');
    error.explicitInternalServerError = true;
    error.error = 'failed to get ClusterServiceVersions';
    error.message = 'Unable to load CSV resources.';
    throw error;
  }

  return csvs.reduce((acc, csv) => {
    if (csv.status.phase === 'Succeeded' && csv.status.reason === 'InstallSucceeded') {
      acc.push(csv);
    }
    return acc;
  }, []);
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

module.exports = { getInstalledKfdefs, getInstalledOperators, getLink, getApplicationDefs };
