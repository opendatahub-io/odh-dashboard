import * as _ from 'lodash';
import createError from 'http-errors';
import { V1ConfigMap } from '@kubernetes/client-node';
import {
  BUILD_PHASE,
  BuildKind,
  BuildStatus,
  ConsoleLinkKind,
  DashboardConfig,
  K8sResourceCommon,
  KfDefApplication,
  KfDefResource,
  KubeFastifyInstance,
  OdhApplication,
  OdhDocument,
  QuickStart,
  SubscriptionKind,
} from '../types';
import {
  DEFAULT_ACTIVE_TIMEOUT,
  DEFAULT_INACTIVE_TIMEOUT,
  ResourceWatcher,
  ResourceWatcherTimeUpdate,
} from './resourceWatcher';
import { getComponentFeatureFlags } from './features';
import { blankDashboardCR } from './constants';
import {
  checkJupyterEnabled,
  getIsAppEnabled,
  getRouteForApplication,
  getRouteForClusterId,
} from './componentUtils';

const dashboardConfigMapName = 'odh-dashboard-config';
const consoleLinksGroup = 'console.openshift.io';
const consoleLinksVersion = 'v1';
const consoleLinksPlural = 'consolelinks';
const enabledAppsConfigMapName = process.env.ENABLED_APPS_CM;
const dashboardGroup = 'dashboard.opendatahub.io';
const dashboardVersion = 'v1';
const applicationsPlural = 'odhapplications';
const documentationsPlural = 'odhdocuments';
const quickStartsGroup = 'console.openshift.io';
const quickStartsVersion = 'v1';
const quickStartsPlural = 'odhquickstarts';

let dashboardConfigWatcher: ResourceWatcher<DashboardConfig>;
let subscriptionWatcher: ResourceWatcher<SubscriptionKind>;
let appWatcher: ResourceWatcher<OdhApplication>;
let docWatcher: ResourceWatcher<OdhDocument>;
let kfDefWatcher: ResourceWatcher<KfDefApplication>;
let buildsWatcher: ResourceWatcher<BuildStatus>;
let consoleLinksWatcher: ResourceWatcher<ConsoleLinkKind>;
let quickStartWatcher: ResourceWatcher<QuickStart>;

const fetchDashboardCR = (fastify: KubeFastifyInstance): Promise<DashboardConfig[]> => {
  const dashboardName = process.env['DASHBOARD_CONFIG'] || dashboardConfigMapName;
  const crResponse: Promise<DashboardConfig[]> = fastify.kube.customObjectsApi
    .getNamespacedCustomObject(
      'opendatahub.io',
      'v1alpha',
      fastify.kube.namespace,
      'odhdashboardconfigs',
      dashboardName,
    )
    .then((res) => {
      const dashboardCR = res?.body as DashboardConfig;
      return [dashboardCR];
    })
    .catch((e) => {
      fastify.log.warn(
        `Received error (${e.body.message}) fetching OdhDashboardConfig, creating new.`,
      );
      return createDashboardCR(fastify);
    });
  return crResponse;
};

const createDashboardCR = (fastify: KubeFastifyInstance): Promise<DashboardConfig[]> => {
  const createResponse: Promise<DashboardConfig[]> = fastify.kube.customObjectsApi
    .createNamespacedCustomObject(
      'opendatahub.io',
      'v1alpha',
      fastify.kube.namespace,
      'odhdashboardconfigs',
      blankDashboardCR,
    )
    .then((result) => [result.body])
    .catch((e) => {
      fastify.log.error('Error creating Dashboard CR: ', e);
      return null;
    });

  return createResponse;
};

const fetchSubscriptions = (fastify: KubeFastifyInstance): Promise<SubscriptionKind[]> => {
  const fetchAll = async (): Promise<SubscriptionKind[]> => {
    const subscriptions: SubscriptionKind[] = [];
    let _continue: string = undefined;
    let remainingItemCount = 1;
    try {
      while (remainingItemCount) {
        const res = (await fastify.kube.customObjectsApi.listNamespacedCustomObject(
          'operators.coreos.com',
          'v1alpha1',
          '',
          'subscriptions',
          undefined,
          _continue,
          undefined,
          undefined,
          250,
        )) as {
          body: {
            items: SubscriptionKind[];
            metadata: { _continue: string; remainingItemCount: number };
          };
        };
        const subs = res?.body.items;
        remainingItemCount = res.body?.metadata?.remainingItemCount;
        _continue = res.body?.metadata?._continue;
        if (subs?.length) {
          subscriptions.push(...subs);
        }
      }
    } catch (e) {
      console.error(`ERROR: `, e.body.message);
    }
    return subscriptions;
  };
  return fetchAll();
};

const fetchInstalledKfdefs = async (fastify: KubeFastifyInstance): Promise<KfDefApplication[]> => {
  const customObjectsApi = fastify.kube.customObjectsApi;
  const namespace = fastify.kube.namespace;

  try {
    const res = await customObjectsApi.listNamespacedCustomObject(
      'kfdef.apps.kubeflow.org',
      'v1',
      namespace,
      'kfdefs',
    );
    const kfdefs = (res?.body as { items: KfDefResource[] })?.items;
    return kfdefs.reduce((acc, kfdef) => {
      if (kfdef?.spec?.applications?.length) {
        acc.push(...kfdef.spec.applications);
      }
      return acc;
    }, [] as KfDefApplication[]);
  } catch (e) {
    fastify.log.error(e, 'failed to get kfdefs');
    const error = createError(500, 'failed to get kfdefs');
    error.explicitInternalServerError = true;
    error.error = 'failed to get kfdefs';
    error.message =
      'Unable to load Kubeflow resources. Please ensure the Open Data Hub operator has been installed.';
    throw error;
  }
};

const fetchQuickStarts = async (fastify: KubeFastifyInstance): Promise<QuickStart[]> => {
  const fetchAll = async (): Promise<QuickStart[]> => {
    const installedQuickStarts: QuickStart[] = [];
    let _continue: string = undefined;
    let remainingItemCount = 1;
    const featureFlags = getComponentFeatureFlags();

    const customObjectsApi = fastify.kube.customObjectsApi;
    try {
      while (remainingItemCount) {
        const res = (await customObjectsApi.listNamespacedCustomObject(
          quickStartsGroup,
          quickStartsVersion,
          fastify.kube.namespace,
          quickStartsPlural,
          undefined,
          _continue,
          undefined,
          undefined,
          250,
        )) as {
          body: {
            items: QuickStart[];
            metadata: { _continue: string; remainingItemCount: number };
          };
        };
        const qStarts = res?.body.items;
        remainingItemCount = res.body?.metadata?.remainingItemCount;
        _continue = res.body?.metadata?._continue;

        const isJupyterEnabled = checkJupyterEnabled();

        qStarts.forEach((qStart) => {
          if (qStart.spec.appName === 'jupyterhub' && isJupyterEnabled) {
            qStart.spec.appName = 'jupyter';
          } else if (qStart.spec.appName === 'jupyter' && !isJupyterEnabled) {
            qStart.spec.appName = 'jupyterhub';
          }
          if (!qStart.spec.featureFlag || featureFlags[qStart.spec.featureFlag]) {
            installedQuickStarts.push(qStart);
          }
        });
      }
    } catch (e) {
      fastify.log.error(`Error fetching quick starts: ${e.response?.body?.message || e.message}`);
    }

    return installedQuickStarts;
  };
  return fetchAll();
};

const fetchApplicationDefs = async (fastify: KubeFastifyInstance): Promise<OdhApplication[]> => {
  const fetchAll = async (): Promise<OdhApplication[]> => {
    const applicationDefs: OdhApplication[] = [];
    const featureFlags = getComponentFeatureFlags();
    const customObjectsApi = fastify.kube.customObjectsApi;
    let _continue: string = undefined;
    let remainingItemCount = 1;
    try {
      while (remainingItemCount) {
        const res = (await customObjectsApi.listNamespacedCustomObject(
          dashboardGroup,
          dashboardVersion,
          fastify.kube.namespace,
          applicationsPlural,
          undefined,
          _continue,
          undefined,
          undefined,
          250,
        )) as {
          body: {
            items: OdhApplication[];
            metadata: { _continue: string; remainingItemCount: number };
          };
        };
        const apps = res?.body.items;
        remainingItemCount = res.body?.metadata?.remainingItemCount;
        _continue = res.body?.metadata?._continue;
        apps.forEach((app) => {
          if (!app.spec.featureFlag || featureFlags[app.spec.featureFlag]) {
            applicationDefs.push(app);
          }
        });
      }
    } catch (e) {
      fastify.log.error(`Error fetching applications: ${e.response?.body?.message || e.message}`);
    }
    return Promise.resolve(applicationDefs);
  };
  return fetchAll();
};

export const fetchApplications = async (
  fastify: KubeFastifyInstance,
): Promise<OdhApplication[]> => {
  const applicationDefs = await fetchApplicationDefs(fastify);
  const applications = [];
  let changed = false;
  const enabledAppsCMData: { [key: string]: string } = {};

  const coreV1Api = fastify.kube.coreV1Api;
  const namespace = fastify.kube.namespace;
  const enabledAppsCM: V1ConfigMap = await coreV1Api
    .readNamespacedConfigMap(enabledAppsConfigMapName, namespace)
    .then((result) => result.body)
    .catch(() => null);
  for (const appDef of applicationDefs) {
    appDef.spec.shownOnEnabledPage = enabledAppsCM?.data?.[appDef.metadata.name] === 'true';
    appDef.spec.isEnabled = await getIsAppEnabled(fastify, appDef);
    if (appDef.spec.isEnabled) {
      if (!appDef.spec.shownOnEnabledPage) {
        changed = true;
        enabledAppsCMData[appDef.metadata.name] = 'true';
        appDef.spec.shownOnEnabledPage = true;
      }
    }
    applications.push({
      ...appDef,
      spec: {
        ...appDef.spec,
        getStartedLink: getRouteForClusterId(fastify, appDef.spec.getStartedLink),
        link: appDef.spec.isEnabled ? await getRouteForApplication(fastify, appDef) : undefined,
      },
    });
  }
  if (changed) {
    // write enabled apps configmap
    const cmBody: V1ConfigMap = {
      metadata: {
        name: enabledAppsConfigMapName,
        namespace: namespace,
      },
      data: enabledAppsCMData,
    };
    if (!enabledAppsCM) {
      await coreV1Api.createNamespacedConfigMap(namespace, cmBody);
    } else {
      cmBody.data = { ...enabledAppsCM.data, ...enabledAppsCMData };
      await coreV1Api.replaceNamespacedConfigMap(enabledAppsConfigMapName, namespace, cmBody);
    }
  }
  return Promise.resolve(applications);
};

const fetchDocs = async (fastify: KubeFastifyInstance): Promise<OdhDocument[]> => {
  const fetchAll = async (): Promise<OdhDocument[]> => {
    const docs: OdhDocument[] = [];
    const featureFlags = getComponentFeatureFlags();
    const appDefs = await fetchApplicationDefs(fastify);
    let _continue: string = undefined;
    let remainingItemCount = 1;
    try {
      while (remainingItemCount) {
        const customObjectsApi = fastify.kube.customObjectsApi;
        const res = (await customObjectsApi.listNamespacedCustomObject(
          dashboardGroup,
          dashboardVersion,
          fastify.kube.namespace,
          documentationsPlural,
          undefined,
          _continue,
          undefined,
          undefined,
          250,
        )) as {
          body: {
            items: OdhDocument[];
            metadata: { _continue: string; remainingItemCount: number };
          };
        };
        const odhDocuments = res?.body.items;
        remainingItemCount = res.body?.metadata?.remainingItemCount;
        _continue = res.body?.metadata?._continue;

        odhDocuments.forEach((doc) => {
          if (doc.spec.appName === 'jupyterhub' && checkJupyterEnabled()) {
            doc.spec.appName = 'jupyter';
          }
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
      }
    } catch (e) {
      fastify.log.error(
        `Error fetching documentation resources: ${e.response?.body?.message || e.message}`,
      );
    }

    return Promise.resolve(docs);
  };
  return fetchAll();
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
      const bcBuilds = (
        res?.body as {
          items: BuildKind[];
        }
      )?.items;
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
      fastify.log.error(e.response?.body?.message || e.message, 'failed to get build configs');
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
    return { activeWatchInterval: 30 * 1000, inactiveWatchInterval: DEFAULT_INACTIVE_TIMEOUT };
  }

  return {
    activeWatchInterval: DEFAULT_ACTIVE_TIMEOUT,
    inactiveWatchInterval: DEFAULT_INACTIVE_TIMEOUT,
  };
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
  dashboardConfigWatcher = new ResourceWatcher<DashboardConfig>(fastify, fetchDashboardCR);
  subscriptionWatcher = new ResourceWatcher<SubscriptionKind>(fastify, fetchSubscriptions);
  kfDefWatcher = new ResourceWatcher<KfDefApplication>(fastify, fetchInstalledKfdefs);
  appWatcher = new ResourceWatcher<OdhApplication>(fastify, fetchApplications);
  docWatcher = new ResourceWatcher<OdhDocument>(fastify, fetchDocs);
  quickStartWatcher = new ResourceWatcher<QuickStart>(fastify, fetchQuickStarts);
  buildsWatcher = new ResourceWatcher<BuildStatus>(fastify, fetchBuilds, getRefreshTimeForBuilds);
  consoleLinksWatcher = new ResourceWatcher<ConsoleLinkKind>(fastify, fetchConsoleLinks);
};

export const getDashboardConfig = (): DashboardConfig => {
  const config = dashboardConfigWatcher.getResources()?.[0];
  return _.merge({}, blankDashboardCR, config); // merge with blank CR to prevent any missing values
};

export const updateDashboardConfig = (): Promise<void> => {
  return dashboardConfigWatcher.updateResults();
};

export const getSubscriptions = (): SubscriptionKind[] => {
  return subscriptionWatcher.getResources();
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
