import * as jsYaml from 'js-yaml';
import createError from 'http-errors';
import {
  CSVKind,
  K8sResourceCommon,
  KfDefApplication,
  KfDefResource,
  KubeFastifyInstance,
  ODHApp,
  ODHDoc,
} from '../types';
import { ResourceWatcher } from './resourceWatcher';
import path from 'path';
import { getComponentFeatureFlags } from './features';
import fs from 'fs';
import { yamlRegExp } from './constants';

let operatorWatcher: ResourceWatcher<CSVKind>;
let serviceWatcher: ResourceWatcher<K8sResourceCommon>;
let appWatcher: ResourceWatcher<ODHApp>;
let docWatcher: ResourceWatcher<ODHDoc>;
let kfDefWatcher: ResourceWatcher<KfDefApplication>;

const fetchInstalledOperators = (fastify: KubeFastifyInstance): Promise<CSVKind[]> => {
  return fastify.kube.customObjectsApi
    .listNamespacedCustomObject('operators.coreos.com', 'v1alpha1', '', 'clusterserviceversions')
    .then((res) => {
      const csvs = (res?.body as { items: CSVKind[] })?.items;
      if (csvs?.length) {
        return csvs.reduce((acc, csv) => {
          if (csv.status?.phase === 'Succeeded' && csv.status?.reason === 'InstallSucceeded') {
            acc.push(csv);
          }
          return acc;
        }, []);
      }
      return [];
    })
    .catch((e) => {
      console.error(e, 'failed to get ClusterServiceVersions');
      return [];
    });
};

const fetchServices = (fastify: KubeFastifyInstance) => {
  return fastify.kube.coreV1Api
    .listServiceForAllNamespaces()
    .then((res) => {
      return res?.body?.items;
    })
    .catch((e) => {
      console.error(e, 'failed to get Services');
      return [];
    });
};

const fetchInstalledKfdefs = async (fastify: KubeFastifyInstance): Promise<KfDefApplication[]> => {
  const customObjectsApi = fastify.kube.customObjectsApi;
  const namespace = fastify.kube.namespace;

  let kfdef: KfDefResource;
  try {
    const res = await customObjectsApi.listNamespacedCustomObject(
      'kfdef.apps.kubeflow.org',
      'v1',
      namespace,
      'kfdefs',
    );
    kfdef = (res?.body as { items: KfDefResource[] })?.items?.[0];
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

const fetchApplicationDefs = (): Promise<ODHApp[]> => {
  const normalizedPath = path.join(__dirname, '../../../data/applications');
  const applicationDefs: ODHApp[] = [];
  const featureFlags = getComponentFeatureFlags();
  fs.readdirSync(normalizedPath).forEach((file) => {
    if (yamlRegExp.test(file)) {
      try {
        const doc = jsYaml.load(fs.readFileSync(path.join(normalizedPath, file), 'utf8'));
        if (!doc.spec.featureFlag || featureFlags[doc.spec.featureFlag]) {
          applicationDefs.push(doc);
        }
      } catch (e) {
        console.error(`Error loading application definition ${file}: ${e}`);
      }
    }
  });
  return Promise.resolve(applicationDefs);
};

const fetchDocs = async (): Promise<ODHDoc[]> => {
  const normalizedPath = path.join(__dirname, '../../../data/docs');
  const docs: ODHDoc[] = [];
  const featureFlags = getComponentFeatureFlags();
  const appDefs = await fetchApplicationDefs();

  fs.readdirSync(normalizedPath).forEach((file) => {
    if (yamlRegExp.test(file)) {
      try {
        const doc: ODHDoc = jsYaml.load(fs.readFileSync(path.join(normalizedPath, file), 'utf8'));
        if (doc.spec.featureFlag) {
          if (featureFlags[doc.spec.featureFlag]) {
            docs.push(doc);
          }
          return;
        }
        if (!doc.spec.appName || appDefs.find((def) => def.metadata.name === doc.spec.appName)) {
          docs.push(doc);
        }
      } catch (e) {
        console.error(`Error loading doc ${file}: ${e}`);
      }
    }
  });
  return Promise.resolve(docs);
};

export const initializeWatchedResources = (fastify: KubeFastifyInstance): void => {
  operatorWatcher = new ResourceWatcher<CSVKind>(fastify, fetchInstalledOperators);
  serviceWatcher = new ResourceWatcher<K8sResourceCommon>(fastify, fetchServices);
  kfDefWatcher = new ResourceWatcher<KfDefApplication>(fastify, fetchInstalledKfdefs);
  appWatcher = new ResourceWatcher<ODHApp>(fastify, fetchApplicationDefs);
  docWatcher = new ResourceWatcher<ODHDoc>(fastify, fetchDocs);
};

export const getInstalledOperators = (): K8sResourceCommon[] => {
  return operatorWatcher.getResources();
};

export const getServices = (): K8sResourceCommon[] => {
  return serviceWatcher.getResources();
};

export const getInstalledKfdefs = (): KfDefApplication[] => {
  return kfDefWatcher.getResources();
};
export const getApplicationDefs = (): ODHApp[] => {
  return appWatcher.getResources();
};

export const getApplicationDef = (appName: string): ODHApp => {
  const appDefs = getApplicationDefs();
  return appDefs.find((appDef) => appDef.metadata.name === appName);
};

export const getDocs = (): ODHDoc[] => {
  return docWatcher.getResources();
};
