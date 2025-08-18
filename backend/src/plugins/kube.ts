import * as fs from 'fs';
import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import * as jsYaml from 'js-yaml';
import * as k8s from '@kubernetes/client-node';
import { errorHandler, isKubeFastifyInstance } from '../utils';
import { DEV_MODE } from '../utils/constants';
import {
  cleanupGPU,
  cleanupKserveRoleBindings,
  initializeWatchedResources,
} from '../utils/resourceUtils';

const CONSOLE_CONFIG_YAML_FIELD = 'console-config.yaml';

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const currentContext = kc.getCurrentContext();
const customObjectsApi = kc.makeApiClient(k8s.CustomObjectsApi);
const coreV1Api = kc.makeApiClient(k8s.CoreV1Api);
const batchV1Api = kc.makeApiClient(k8s.BatchV1Api);
const batchV1beta1Api = kc.makeApiClient(k8s.BatchV1beta1Api);
const currentUser = kc.getCurrentUser();
const rbac = kc.makeApiClient(k8s.RbacAuthorizationV1Api);

export default fp(async (fastify: FastifyInstance) => {
  let namespace;
  try {
    namespace = await getCurrentNamespace();
  } catch (e) {
    fastify.log.error(e, 'Failed to retrieve current namespace');
  }

  let currentToken;
  try {
    currentToken = await getCurrentToken();
  } catch (e) {
    currentToken = '';
    fastify.log.error(e, 'Failed to retrieve current token');
  }

  let clusterID;
  try {
    const clusterVersion = await customObjectsApi.getClusterCustomObject(
      'config.openshift.io',
      'v1',
      'clusterversions',
      'version',
    );
    clusterID = (clusterVersion.body as { spec: { clusterID: string } }).spec.clusterID;
  } catch (e) {
    fastify.log.error(e, `Failed to retrieve cluster id: ${errorHandler(e)}.`);
  }
  let clusterBranding = 'okd';
  try {
    const consoleConfig = await coreV1Api
      .readNamespacedConfigMap('console-config', 'openshift-console')
      .then((result) => result.body);
    if (consoleConfig.data?.[CONSOLE_CONFIG_YAML_FIELD]) {
      const consoleConfigData = jsYaml.load(consoleConfig.data[CONSOLE_CONFIG_YAML_FIELD]) as any;
      clusterBranding = consoleConfigData.customization?.branding || 'okd';
      fastify.log.info(`Cluster Branding: ${clusterBranding}`);
    }
  } catch (e) {
    fastify.log.error(`Failed to retrieve console cluster info: ${errorHandler(e)}`);
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
    currentToken,
    clusterID,
    clusterBranding,
    rbac,
  });

  // Initialize the watching of resources
  if (isKubeFastifyInstance(fastify)) {
    initializeWatchedResources(fastify);

    cleanupGPU(fastify).catch((e) =>
      fastify.log.error(
        `Unable to fully convert GPU to use accelerator profiles. ${
          e.response?.body?.message || e.message || e
        }`,
      ),
    );

    cleanupKserveRoleBindings(fastify).catch((e) =>
      fastify.log.error(
        `Unable to fully convert kserve rolebindings to use secure role. ${
          e.response?.body?.message || e.message || e
        }`,
      ),
    );
  }
});

const getCurrentNamespace = async () =>
  new Promise((resolve, reject) => {
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

const getCurrentToken = async () =>
  new Promise((resolve, reject) => {
    if (currentContext === 'inClusterContext') {
      const location =
        currentUser?.authProvider?.config?.tokenFile ||
        '/var/run/secrets/kubernetes.io/serviceaccount/token';
      fs.readFile(location, 'utf8', (err, data) => {
        if (err) {
          reject(err);
        }
        resolve(data);
      });
    } else {
      resolve(currentUser?.token || '');
    }
  });
