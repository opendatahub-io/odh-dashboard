import * as fs from 'fs';
import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import * as k8s from '@kubernetes/client-node';
import { DEV_MODE } from '../utils/constants';
import { initializeWatchedResources } from '../utils/resourceUtils';

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const currentContext = kc.getCurrentContext();
const customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi);
const coreV1Api = kc.makeApiClient(k8s.CoreV1Api);
const batchV1Api = kc.makeApiClient(k8s.BatchV1Api);
const batchV1beta1Api = kc.makeApiClient(k8s.BatchV1beta1Api);
const rbacAuthorizationV1Api = kc.makeApiClient(k8s.RbacAuthorizationV1Api);
const currentUser = kc.getCurrentUser();

export default fp(async (fastify: FastifyInstance) => {
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
    rbacAuthorizationV1Api,
    currentUser,
  });

  // Initialize the watching of resources
  initializeWatchedResources(fastify);
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
