import * as fs from 'fs';
import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import * as jsYaml from 'js-yaml';
import * as k8s from '@kubernetes/client-node';
import { DEV_MODE } from '../utils/constants';
import { initializeWatchedResources } from '../utils/resourceUtils';
import { V1Secret, V1ServiceAccount } from '@kubernetes/client-node';

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

  let saToken;
  try {
    if (currentContext === 'inClusterContext') {
      saToken = await getSAToken();
    } else if (DEV_MODE) {
      saToken = await getSATokenLocal();
    } else {
      saToken = undefined;
    }
  } catch (e) {
    fastify.log.error(e, 'Failed to retrieve Service Account token');
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
    fastify.log.error(`Failed to retrieve cluster id: ${e.response?.body?.message || e.message}.`);
  }
  let clusterBranding = 'okd';
  try {
    const consoleConfig = await coreV1Api
      .readNamespacedConfigMap('console-config', 'openshift-console')
      .then((result) => result.body);
    if (consoleConfig?.data?.[CONSOLE_CONFIG_YAML_FIELD]) {
      const consoleConfigData = jsYaml.load(consoleConfig.data[CONSOLE_CONFIG_YAML_FIELD]);
      clusterBranding = consoleConfigData.customization?.branding || 'okd';
      fastify.log.info(`Cluster Branding: ${clusterBranding}`);
    }
  } catch (e) {
    fastify.log.error(
      `Failed to retrieve console cluster info: ${e.response?.body?.message || e.message}`,
    );
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
    clusterID,
    clusterBranding,
    rbac,
    saToken,
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

const getSAToken = async () => {
  return new Promise<string>((resolve, reject) => {
    fs.readFile('/var/run/secrets/kubernetes.io/serviceaccount/token', (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(String(data));
    });
  });
};

const getSATokenLocal = async () => {
  const promSA = await coreV1Api
    .readNamespacedServiceAccount('prometheus-k8s', 'openshift-monitoring')
    .then((res) => res.body as V1ServiceAccount);
  let promTokenName = '';
  for (let i = 0; i < promSA.secrets.length; i++) {
    if (promSA.secrets[i].name.includes('token')) {
      promTokenName = promSA.secrets[i].name;
    }
  }
  const promSecret = await coreV1Api
    .readNamespacedSecret(promTokenName, 'openshift-monitoring')
    .then((res) => res.body as V1Secret);
  const promToken = decodeB64(promSecret.data.token);

  return promToken;
};

const decodeB64 = (str: string): string => Buffer.from(str, 'base64').toString('binary');
