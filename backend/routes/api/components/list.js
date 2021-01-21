const _ = require('lodash');
const createError = require('http-errors');
const availableComponents = require('./available-components');

module.exports = async function ({ fastify }) {
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
    error.message = 'Unable to load Kubeflow resources. Please ensure the Open Data Hub operator has been installed.';
    return error;
  }

  let kfdefApps = _.get(kfdef, 'spec.applications') || [];
  let kfdefAppSet = new Set();
  kfdefApps.forEach((app) => kfdefAppSet.add(app.name));

  let appList = await Promise.all(
    availableComponents.map(async (ac) => {
      const { key, label, description, img, docsLink } = ac;
      let copy = { key, label, description, img, docsLink };
      copy.enabled = ac.kfdefApplications.reduce((accumulator, currentValue) => {
        return accumulator && kfdefAppSet.has(currentValue);
      }, true);
      if (copy.enabled && ac.route) {
        copy.link = await getLink(fastify, customObjectsApi, namespace, ac.route);
      }
      return copy;
    }),
  );

  return appList;
};

async function getLink(fastify, api, namespace, routeName) {
  try {
    const res = await api.getNamespacedCustomObject(
      'route.openshift.io',
      'v1',
      namespace,
      'routes',
      routeName,
    );
    const host = _.get(res, 'body.spec.host');
    const tlsTerm = _.get(res, 'body.spec.tls.termination');
    const protocol = tlsTerm ? 'https://' : 'http://';
    return `${protocol}${host}`;
  } catch (e) {
    fastify.log.error(e, `failed to get route ${routeName}`);
    return null;
  }
}
