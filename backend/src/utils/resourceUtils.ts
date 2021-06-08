import k8s from '@kubernetes/client-node';
import createError from 'http-errors';
import {
  BuildKind,
  BuildStatus,
  CSVKind,
  K8sResourceCommon,
  KfDefApplication,
  KfDefResource,
  KubeFastifyInstance,
  OdhApplication,
  OdhDocument,
} from '../types';
import {
  DEFAULT_ACTIVE_TIMEOUT,
  ResourceWatcher,
  ResourceWatcherTimeUpdate,
} from './resourceWatcher';
import { getComponentFeatureFlags } from './features';

let operatorWatcher: ResourceWatcher<CSVKind>;
let serviceWatcher: ResourceWatcher<k8s.V1Service>;
let appWatcher: ResourceWatcher<OdhApplication>;
let docWatcher: ResourceWatcher<OdhDocument>;
let kfDefWatcher: ResourceWatcher<KfDefApplication>;
let buildsWatcher: ResourceWatcher<BuildStatus>;

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

const fetchServices = (fastify: KubeFastifyInstance): Promise<k8s.V1Service[]> => {
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

const fetchApplicationDefs = async (fastify: KubeFastifyInstance): Promise<OdhApplication[]> => {
  const customObjectsApi = fastify.kube.customObjectsApi;
  const namespace = fastify.kube.namespace;
  const featureFlags = getComponentFeatureFlags();

  let odhApplications: OdhApplication[];
  try {
    const res = await customObjectsApi.listNamespacedCustomObject(
      'applications.console.openshift.io',
      'v1alpha1',
      namespace,
      'odhapplications',
    );
    const cas = (res?.body as { items: OdhApplication[] })?.items;
    odhApplications = cas.reduce((acc, ca) => {
      if (!ca.spec.featureFlag || featureFlags[ca.spec.featureFlag]) {
        acc.push(ca);
      }
      return acc;
    }, []);
  } catch (e) {
    fastify.log.error(e, 'failed to get odhapplications');
    const error = createError(500, 'failed to get odhapplications');
    error.explicitInternalServerError = true;
    error.error = 'failed to get odhapplications';
    error.message =
      'Unable to get OdhApplication resources. Please ensure the Open Data Hub operator has been installed.';
    throw error;
  }
  return Promise.resolve(odhApplications);
};

const fetchDocs = async (fastify: KubeFastifyInstance): Promise<OdhDocument[]> => {
  const customObjectsApi = fastify.kube.customObjectsApi;
  const namespace = fastify.kube.namespace;
  const featureFlags = getComponentFeatureFlags();
  const appDefs = await fetchApplicationDefs(fastify);

  let odhDocuments: OdhDocument[];
  try {
    const res = await customObjectsApi.listNamespacedCustomObject(
      'documents.console.openshift.io',
      'v1alpha1',
      namespace,
      'odhdocuments',
    );
    const cas = (res?.body as { items: OdhDocument[] })?.items;
    if (cas?.length > 0) {
      odhDocuments = cas.reduce((acc, cd) => {
        if (cd.spec.featureFlag) {
          if (featureFlags[cd.spec.featureFlag]) {
            acc.push(cd);
          }
        } else if (
          !cd.spec.appName ||
          appDefs.find((def) => def.metadata.name === cd.spec.appName)
        ) {
          acc.push(cd);
        } else if (!cd.spec.featureFlag || featureFlags[cd.spec.featureFlag]) {
          acc.push(cd);
        }
        return acc;
      }, []);
    }
  } catch (e) {
    fastify.log.error(e, 'failed to get odhdocuments');
    const error = createError(500, 'failed to get odhdocuments');
    error.explicitInternalServerError = true;
    error.error = 'failed to get odhdocuments';
    error.message =
      'Unable to get OdhDocument resources. Please ensure the Open Data Hub operator has been installed.';
    throw error;
  }
  return Promise.resolve(odhDocuments);
};

const getBuildConfigStatus = (
  fastify: KubeFastifyInstance,
  buildConfig: K8sResourceCommon,
): Promise<BuildStatus> => {
  const bcName = buildConfig.metadata.name;
  const notebookName = buildConfig.metadata.labels?.['opendatahub.io/notebook-name'] || bcName;
  return fastify.kube.customObjectsApi
    .listNamespacedCustomObject(
      'build.openshift.io',
      'v1',
      fastify.kube.namespace,
      'builds',
      undefined,
      undefined,
      undefined,
      `buildconfig=${bcName}`,
    )
    .then((res) => {
      const bcBuilds = (res?.body as {
        items: BuildKind[];
      })?.items;
      if (bcBuilds.length === 0) {
        return {
          name: notebookName,
          status: 'pending',
        };
      }
      const mostRecent = bcBuilds
        .sort((bc1, bc2) => {
          const name1 = parseInt(bc1.metadata.name.split('_').pop());
          const name2 = parseInt(bc2.metadata.name.split('_').pop());
          return name1 - name2;
        })
        .pop();
      return {
        name: notebookName,
        status: mostRecent.status.phase,
        timestamp: mostRecent.status.completionTimestamp || mostRecent.status.startTimestamp,
      };
    })
    .catch((e) => {
      console.dir(e);
      return {
        name: notebookName,
        status: 'pending',
      };
    });
};

export const fetchBuilds = async (fastify: KubeFastifyInstance): Promise<BuildStatus[]> => {
  const nbBuildConfigs: K8sResourceCommon[] = await fastify.kube.customObjectsApi
    .listNamespacedCustomObject(
      'build.openshift.io',
      'v1',
      fastify.kube.namespace,
      'buildconfigs',
      undefined,
      undefined,
      undefined,
      'opendatahub.io/build_type=notebook_image',
    )
    .then((res) => {
      return (res?.body as { items: K8sResourceCommon[] })?.items;
    })
    .catch(() => {
      return [];
    });
  const baseBuildConfigs: K8sResourceCommon[] = await fastify.kube.customObjectsApi
    .listNamespacedCustomObject(
      'build.openshift.io',
      'v1',
      fastify.kube.namespace,
      'buildconfigs',
      undefined,
      undefined,
      undefined,
      'opendatahub.io/build_type=base_image',
    )
    .then((res) => {
      return (res?.body as { items: K8sResourceCommon[] })?.items;
    })
    .catch(() => {
      return [];
    });

  const buildConfigs = [...nbBuildConfigs, ...baseBuildConfigs];

  const getters = buildConfigs.map(async (buildConfig) => {
    return getBuildConfigStatus(fastify, buildConfig);
  });

  return Promise.all(getters);
};

const getRefreshTimeForBuilds = (buildStatuses: BuildStatus[]): ResourceWatcherTimeUpdate => {
  const runningStatuses = ['pending', 'running', 'cancelled'];
  const building = buildStatuses.filter((buildStatus) =>
    runningStatuses.includes(buildStatus.status.toLowerCase()),
  );
  if (building.length) {
    return { activeWatchInterval: 30 * 1000 };
  }

  return { activeWatchInterval: DEFAULT_ACTIVE_TIMEOUT };
};

export const initializeWatchedResources = (fastify: KubeFastifyInstance): void => {
  operatorWatcher = new ResourceWatcher<CSVKind>(fastify, fetchInstalledOperators);
  serviceWatcher = new ResourceWatcher<k8s.V1Service>(fastify, fetchServices);
  kfDefWatcher = new ResourceWatcher<KfDefApplication>(fastify, fetchInstalledKfdefs);
  appWatcher = new ResourceWatcher<OdhApplication>(fastify, fetchApplicationDefs);
  docWatcher = new ResourceWatcher<OdhDocument>(fastify, fetchDocs);
  buildsWatcher = new ResourceWatcher<BuildStatus>(fastify, fetchBuilds, getRefreshTimeForBuilds);
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

export const getApplicationDefs = (): OdhApplication[] => {
  return appWatcher.getResources();
};

export const updateApplicationDefs = (): Promise<void> => {
  return appWatcher.updateResults();
};

export const getApplicationDef = (appName: string): OdhApplication => {
  const appDefs = getApplicationDefs();
  return appDefs.find((appDef) => appDef.metadata.name === appName);
};

export const getDocs = (): OdhDocument[] => {
  return docWatcher.getResources();
};

export const getBuildStatuses = (): { name: string; status: string }[] => {
  return buildsWatcher.getResources();
};
