const _ = require('lodash');
const availableComponents = require('./available-components');

module.exports = async function({fastify, opts, request, reply}) {
  const customObjectsApi = fastify.kube.customObjectsApi;
  const namespace = fastify.kube.namespace;

  let kfdef;
  try {
    const res = await customObjectsApi.listNamespacedCustomObject(
      'kfdef.apps.kubeflow.org',
      'v1',
      namespace,
      'kfdefs');
    kfdef = _.get(res, 'body.items[0]');
  } catch (e) {
    fastify.log.error(e, 'failed to get kfdefs');
    throw e;
  }

  let kfdefApps = _.get(kfdef, 'spec.applications') || [];
  let kfdefAppSet = new Set();
  kfdefApps.forEach(app => kfdefAppSet.add(app.name));

  let appList = await Promise.all(availableComponents.map(async (ac) => {
    const {label, description, route, img} = ac;
    let copy = {label, description, route, img};
    copy.enabled = ac.kfdefApplications.reduce((accumulator, currentValue) => {
      return accumulator && kfdefAppSet.has(currentValue);
    }, true)
    if (copy.enabled && copy.route) {
      copy.link = await getLink(fastify, customObjectsApi, namespace, copy.route)
    }
    return copy;
  }));

  const kubeflow = appList[0];
  kubeflow.link = await getLink(fastify, customObjectsApi, 'istio-system', 'istio-ingressgateway');
  kubeflow.enabled = !!kubeflow.link;

  return appList;
};

async function getLink(fastify, api, namespace, routeName) {
  try {
    const res = await api.getNamespacedCustomObject(
      'route.openshift.io',
      'v1',
      namespace,
      'routes',
      routeName);
    const host = _.get(res, 'body.spec.host');
    const tlsTerm = _.get(res, 'body.spec.tls.termination');
    const protocol = tlsTerm ? 'https://' : 'http://';
    return `${protocol}${host}`;
  } catch (e) {
    fastify.log.error(e, `failed to get route ${routeName}`);
    return null;
  }
}
