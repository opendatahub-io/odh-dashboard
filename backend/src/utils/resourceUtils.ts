import createError from 'http-errors';
import { V1ConfigMap } from '@kubernetes/client-node';
import * as _ from 'lodash';
import {
  BUILD_PHASE,
  BuildKind,
  BuildStatus,
  ConsoleLinkKind,
  CSVKind,
  DashboardConfig,
  K8sResourceCommon,
  KfDefApplication,
  KfDefResource,
  KubeFastifyInstance,
  OdhApplication,
  OdhDocument,
  OdhDocumentType,
  QuickStart,
} from '../types';
import {
  DEFAULT_ACTIVE_TIMEOUT,
  ResourceWatcher,
  ResourceWatcherTimeUpdate,
} from './resourceWatcher';
import { getComponentFeatureFlags } from './features';
import {
  combineCategoryAnnotations,
  getIsAppEnabled,
  getRouteForApplication,
  getRouteForClusterId,
} from './componentUtils';

const dashboardConfigMapName = 'odh-dashboard-config';
const consoleLinksGroup = 'console.openshift.io';
const consoleLinksVersion = 'v1';
const consoleLinksPlural = 'consolelinks';

let dashboardConfigWatcher: ResourceWatcher<V1ConfigMap>;
let operatorWatcher: ResourceWatcher<CSVKind>;
let serviceWatcher: ResourceWatcher<K8sResourceCommon>;
let appWatcher: ResourceWatcher<OdhApplication>;
let docWatcher: ResourceWatcher<OdhDocument>;
let quickStartWatcher: ResourceWatcher<QuickStart>;
let kfDefWatcher: ResourceWatcher<KfDefApplication>;
let buildsWatcher: ResourceWatcher<BuildStatus>;
let consoleLinksWatcher: ResourceWatcher<ConsoleLinkKind>;

const DEFAULT_DASHBOARD_CONFIG: V1ConfigMap = {
  metadata: {
    name: dashboardConfigMapName,
    namespace: 'default',
  },
  data: {
    enablement: 'true',
    disableInfo: 'false',
    disableSupport: 'false',
  },
};

const dashboardGroup = 'dashboard.opendatahub.io';
const dashboardVersion = 'v1';

const applicationsPlural = 'odhapplications';
const documentationsPlural = 'odhdocuments';

const quickStartsGroup = 'console.openshift.io';
const quickStartsVersion = 'v1';
const quickStartsPlural = 'odhquickstarts';

const fetchDashboardConfigMap = (fastify: KubeFastifyInstance): Promise<V1ConfigMap[]> => {
  return fastify.kube.coreV1Api
    .readNamespacedConfigMap(dashboardConfigMapName, fastify.kube.namespace)
    .then((result) => [result.body])
    .catch(() => [DEFAULT_DASHBOARD_CONFIG]);
};

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

const fetchApplicationDefs = async (fastify: KubeFastifyInstance): Promise<OdhApplication[]> => {
  const applicationDefs: OdhApplication[] = [];
  const featureFlags = getComponentFeatureFlags();

  const customObjectsApi = fastify.kube.customObjectsApi;
  try {
    const res = await customObjectsApi.listNamespacedCustomObject(
      dashboardGroup,
      dashboardVersion,
      fastify.kube.namespace,
      applicationsPlural,
    );
    const odhApplications = (res.body as { items: OdhApplication[] })?.items ?? [];

    odhApplications.forEach((app) => {
      if (!app.spec.featureFlag || featureFlags[app.spec.featureFlag]) {
        applicationDefs.push(app);
      }
    });
  } catch (e) {
    fastify.log.error(`Error fetching applications: ${e.response?.body?.message || e.message}`);
  }

  return Promise.resolve(applicationDefs);
};

export const fetchApplications = async (
  fastify: KubeFastifyInstance,
): Promise<OdhApplication[]> => {
  const applicationDefs = await fetchApplicationDefs(fastify);
  const applications = [];

  for (const appDef of applicationDefs) {
    const isEnabled = await getIsAppEnabled(fastify, appDef);
    applications.push({
      ...appDef,
      spec: {
        ...appDef.spec,
        getStartedLink: getRouteForClusterId(fastify, appDef.spec.getStartedLink),
        isEnabled,
        link: isEnabled ? await getRouteForApplication(fastify, appDef) : undefined,
      },
    });
  }

  return Promise.resolve(applications);
};

const fetchDocs = async (fastify: KubeFastifyInstance): Promise<OdhDocument[]> => {
  const docs: OdhDocument[] = [];
  const featureFlags = getComponentFeatureFlags();
  const appDefs = await fetchApplicationDefs(fastify);
  const quickStarts = await fetchQuickStarts(fastify);

  try {
    const customObjectsApi = fastify.kube.customObjectsApi;
    const res = await customObjectsApi.listNamespacedCustomObject(
      dashboardGroup,
      dashboardVersion,
      fastify.kube.namespace,
      documentationsPlural,
    );
    const odhDocuments = (res.body as { items: OdhDocument[] })?.items ?? [];
    odhDocuments.forEach((doc) => {
      if (doc.spec.featureFlag) {
        if (featureFlags[doc.spec.featureFlag]) {
          docs.push(doc);
        }
        return;
      }
      if (!doc.spec.appName || appDefs.find((def) => def.metadata.name === doc.spec.appName)) {
        docs.push(doc);
      }
    });
  } catch (e) {
    fastify.log.error(
      `Error fetching documentation resources: ${e.response?.body?.message || e.message}`,
    );
  }

  // Add docs for all components' documentation
  appDefs.forEach((component) => {
    if (component.spec.docsLink) {
      const odhDoc: OdhDocument = {
        metadata: {
          name: `${component.metadata.name}-doc`,
        },
        spec: {
          appName: component.metadata.name,
          type: OdhDocumentType.Documentation,
          provider: component.spec.provider,
          url: component.spec.docsLink,
          displayName: component.spec.displayName,
          description: component.spec.description,
        },
      };
      docs.push(odhDoc);
    }
  });

  // Add doc cards for all quick starts
  quickStarts.forEach((quickStart) => {
    const odhDoc: OdhDocument = _.merge({}, quickStart, {
      spec: { ...quickStart.spec, type: OdhDocumentType.QuickStart },
    });
    docs.push(odhDoc);
  });

  const updatedDocApps = docs
    .filter((doc) => doc.spec.type !== 'getting-started')
    .map((odhDoc) => {
      const odhApp = appDefs && appDefs.find((c) => c.metadata.name === odhDoc.spec.appName);
      const updatedDoc = _.cloneDeep(odhDoc);
      if (odhApp) {
        combineCategoryAnnotations(odhDoc, odhApp);
        updatedDoc.spec.appDisplayName = odhApp.spec.displayName;
        updatedDoc.spec.appEnabled = odhApp.spec.isEnabled ?? false;
        updatedDoc.spec.img = odhDoc.spec.img || odhApp.spec.img;
        updatedDoc.spec.description = odhDoc.spec.description || odhApp.spec.description;
        updatedDoc.spec.provider = odhDoc.spec.provider || odhApp.spec.provider;
      } else {
        updatedDoc.spec.appEnabled = false;
      }
      return updatedDoc;
    });

  return Promise.resolve(updatedDocApps);
};

const fetchQuickStarts = async (fastify: KubeFastifyInstance): Promise<QuickStart[]> => {
  const installedQuickStarts: QuickStart[] = [];
  const featureFlags = getComponentFeatureFlags();

  const customObjectsApi = fastify.kube.customObjectsApi;
  try {
    const res = await customObjectsApi.listNamespacedCustomObject(
      quickStartsGroup,
      quickStartsVersion,
      fastify.kube.namespace,
      quickStartsPlural,
    );
    const quickStarts = (res.body as { items: QuickStart[] })?.items ?? [];
    quickStarts.forEach((quickStart) => {
      if (!quickStart.spec.featureFlag || featureFlags[quickStart.spec.featureFlag]) {
        installedQuickStarts.push(quickStart);
      }
    });
  } catch (e) {
    fastify.log.error(`Error fetching quick starts: ${e.response?.body?.message || e.message}`);
  }

  return installedQuickStarts;
};

const getBuildNumber = (build: BuildKind): number => {
  const buildNumber = build.metadata.annotations?.['openshift.io/build.number'];
  return !!buildNumber && parseInt(buildNumber, 10);
};

const PENDING_PHASES = [BUILD_PHASE.new, BUILD_PHASE.pending, BUILD_PHASE.cancelled];

const compareBuilds = (b1: BuildKind, b2: BuildKind) => {
  const b1Pending = PENDING_PHASES.includes(b1.status.phase);
  const b2Pending = PENDING_PHASES.includes(b2.status.phase);

  if (b1Pending && !b2Pending) {
    return -1;
  }
  if (b2Pending && !b1Pending) {
    return 1;
  }
  return getBuildNumber(b1) - getBuildNumber(b2);
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
          status: BUILD_PHASE.none,
        };
      }
      const mostRecent = bcBuilds.sort(compareBuilds).pop();
      return {
        name: notebookName,
        status: mostRecent.status.phase,
        timestamp: mostRecent.status.completionTimestamp || mostRecent.status.startTimestamp,
      };
    })
    .catch((e) => {
      fastify.log.error(e.response?.body?.message || e.message);
      return {
        name: notebookName,
        status: BUILD_PHASE.pending,
      };
    });
};

export const fetchBuilds = async (fastify: KubeFastifyInstance): Promise<BuildStatus[]> => {
  const buildConfigs: K8sResourceCommon[] = await fastify.kube.customObjectsApi
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

const fetchConsoleLinks = async (fastify: KubeFastifyInstance) => {
  return fastify.kube.customObjectsApi
    .listClusterCustomObject(consoleLinksGroup, consoleLinksVersion, consoleLinksPlural)
    .then((res) => {
      return (res.body as { items: ConsoleLinkKind[] }).items;
    })
    .catch((e) => {
      fastify.log.error(e, 'failed to get ConsoleLinks');
      return [];
    });
};

export const initializeWatchedResources = (fastify: KubeFastifyInstance): void => {
  dashboardConfigWatcher = new ResourceWatcher<V1ConfigMap>(fastify, fetchDashboardConfigMap);
  operatorWatcher = new ResourceWatcher<CSVKind>(fastify, fetchInstalledOperators);
  serviceWatcher = new ResourceWatcher<K8sResourceCommon>(fastify, fetchServices);
  kfDefWatcher = new ResourceWatcher<KfDefApplication>(fastify, fetchInstalledKfdefs);
  appWatcher = new ResourceWatcher<OdhApplication>(fastify, fetchApplications);
  docWatcher = new ResourceWatcher<OdhDocument>(fastify, fetchDocs);
  quickStartWatcher = new ResourceWatcher<QuickStart>(fastify, fetchQuickStarts);
  buildsWatcher = new ResourceWatcher<BuildStatus>(fastify, fetchBuilds, getRefreshTimeForBuilds);
  consoleLinksWatcher = new ResourceWatcher<ConsoleLinkKind>(fastify, fetchConsoleLinks);
};

export const getDashboardConfig = (): DashboardConfig => {
  const config = dashboardConfigWatcher.getResources()?.[0] ?? DEFAULT_DASHBOARD_CONFIG;
  return {
    enablement: (config.data?.enablement ?? '').toLowerCase() !== 'false',
    disableInfo: (config.data?.disableInfo ?? '').toLowerCase() === 'true',
    disableSupport: (config.data?.disableSupport ?? '').toLowerCase() === 'true',
  };
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

export const getApplications = (): OdhApplication[] => {
  return appWatcher.getResources();
};

export const updateApplications = (): Promise<void> => {
  return appWatcher.updateResults();
};

export const getApplication = (appName: string): OdhApplication => {
  const apps = getApplications();
  return apps.find((app) => app.metadata.name === appName);
};

export const getDocs = (): OdhDocument[] => {
  return docWatcher.getResources();
};

export const getQuickStarts = (): QuickStart[] => {
  return quickStartWatcher.getResources();
};

export const getBuildStatuses = (): BuildStatus[] => {
  return buildsWatcher.getResources();
};

export const getConsoleLinks = (): ConsoleLinkKind[] => {
  return consoleLinksWatcher.getResources();
};
