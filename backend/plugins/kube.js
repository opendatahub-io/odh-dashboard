'use strict';
const { DEV_MODE } = require('../utils/constants');

const fs = require('fs');
const fp = require('fastify-plugin');
const k8s = require('@kubernetes/client-node');
const WatchInstalledOperators = require('../utils/watchInstalledOperators');
const WatchServices = require('../utils/watchServices');

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const currentContext = kc.getCurrentContext();
const customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi);
const coreV1Api = kc.makeApiClient(k8s.CoreV1Api);
const batchV1Api = kc.makeApiClient(k8s.BatchV1Api);
const batchV1beta1Api = kc.makeApiClient(k8s.BatchV1beta1Api);
const currentUser = kc.getCurrentUser();

module.exports = fp(async (fastify) => {
  let namespace;
  try {
    namespace = await getCurrentNamespace();
  } catch (e) {
    fastify.log.error(e, 'Failed to retrieve current namespace');
  }

  fastify.decorate('kube', {
    config: kc,
    currentContext,
    namespace,
    coreV1Api,
    batchV1beta1Api,
    batchV1Api,
    customObjectsApi,
    currentUser,
  });

  // TODO: Watch only when a UI connects
  WatchInstalledOperators.startWatching(customObjectsApi);
  WatchServices.startWatching(coreV1Api);
});

const getCurrentNamespace = async () => {
  return new Promise((resolve, reject) => {
    if (currentContext === 'inClusterContext') {
      fs.readFile(
        '/var/run/secrets/kubernetes.io/serviceaccount/namespace',
        'utf8',
        (err, data) => {
          if (err) {
            reject(err);
          }
          resolve(data);
        },
      );
    } else if (DEV_MODE) {
      resolve(process.env.OC_PROJECT);
    } else {
      resolve(currentContext.split('/')[0]);
    }
  });
};
