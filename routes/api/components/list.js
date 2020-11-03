const { default: fastify } = require("fastify");
const _ = require("lodash");
const availableComponents = require("./available-components");

module.exports = async function ({ fastify, opts, request, reply }) {
  const customObjectsApi = fastify.kube.customObjectsApi;
  const namespaces = fastify.kube.namespaces;

  const kfdefApps = (await Promise.all(namespaces.map(async namespace => {
    const kfdefs = await getKfdefs(fastify, customObjectsApi, namespace)

    return kfdefs.map(kfdef => {
      const apps = kfdef?.spec?.applications || [];
      return apps.map(app => ({ name: app.name, namespace: namespace}));
    }).flat();
  }))).flat();

  const kfdefAppsNamesSet = new Set(kfdefApps.map(a => a.name))

  let appList = await Promise.all(
    availableComponents.map(async (ac) => {
      const { key, label, description, img, docsLink } = ac;
      let copy = { key, label, description, img, docsLink };
      copy.enabled = ac.kfdefApplications.reduce(
        (accumulator, currentValue) => {
          return accumulator && kfdefAppsNamesSet.has(currentValue);
        },
        true
      );
      if (copy.enabled && ac.route) {
        copy.namespace = kfdefApps.filter(app => app.name == ac.kfdefApplications[0])[0].namespace;
        copy.link = await getLink(
          fastify,
          customObjectsApi,
          copy.namespace,
          ac.route
        );
      }
      return copy;
    })
  );

  return appList;
};

async function getKfdefs(fastify, api, namespace) {
  try {
    const res =  await api.listNamespacedCustomObject(
      "kfdef.apps.kubeflow.org",
      "v1",
      namespace,
      "kfdefs"
    )
    return res?.body?.items || [];
  } catch (e) {
    fastify.log.warn(e, `Failed to get kfdef in ${namespace}`)
    return [];
  }
};

async function getLink(fastify, api, namespace, routeName) {
  try {
    const res = await api.getNamespacedCustomObject(
      "route.openshift.io",
      "v1",
      namespace,
      "routes",
      routeName
    );
    const host = _.get(res, "body.spec.host");
    const tlsTerm = _.get(res, "body.spec.tls.termination");
    const protocol = tlsTerm ? "https://" : "http://";
    return `${protocol}${host}`;
  } catch (e) {
    fastify.log.error(e, `failed to get route ${routeName}`);
    return null;
  }
}
