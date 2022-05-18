import * as jsYaml from 'js-yaml';
import createError from 'http-errors';
import fs from 'fs';
import path from 'path';
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
  SubscriptionKind,
} from '../types';
import {
  DEFAULT_ACTIVE_TIMEOUT,
  DEFAULT_INACTIVE_TIMEOUT,
  ResourceWatcher,
  ResourceWatcherTimeUpdate,
} from './resourceWatcher';
import { getComponentFeatureFlags } from './features';
import { yamlRegExp, blankDashboardCR } from './constants';
import { getIsAppEnabled, getRouteForClusterId } from './componentUtils';
import fastify from 'fastify';

const dashboardConfigMapName = 'odh-dashboard-config';
const consoleLinksGroup = 'console.openshift.io';
const consoleLinksVersion = 'v1';
const consoleLinksPlural = 'consolelinks';
const enabledAppsConfigMapName = process.env.ENABLED_APPS_CM;

let dashboardConfigWatcher: ResourceWatcher<DashboardConfig>;
let subscriptionWatcher: ResourceWatcher<SubscriptionKind>;
let appWatcher: ResourceWatcher<OdhApplication>;
let docWatcher: ResourceWatcher<OdhDocument>;
let kfDefWatcher: ResourceWatcher<KfDefApplication>;
let buildsWatcher: ResourceWatcher<BuildStatus>;
let consoleLinksWatcher: ResourceWatcher<ConsoleLinkKind>;

// const fetchDashboardConfigMap = (fastify: KubeFastifyInstance): Promise<V1ConfigMap[]> => {
//   return fastify.kube.coreV1Api
//     .readNamespacedConfigMap(dashboardConfigMapName, fastify.kube.namespace)
//     .then((result) => [result.body])
//     .catch(() => [DEFAULT_DASHBOARD_CONFIG]);
// };

const fetchDashboardCR = (fastify: KubeFastifyInstance): Promise<DashboardConfig[]> => {
  const crResponse: Promise<DashboardConfig[]> = fastify.kube.customObjectsApi
  .listNamespacedCustomObject(
    'opendatahub.io',
    'v1alpha',
    fastify.kube.namespace,
    'odhdashboards',
  )
  .then((res) => {
    const dashboardCR = (
      res?.body as {
        items: DashboardConfig[];
      }
    )?.items;
    if (dashboardCR.length === 0) {
      return createDashboardCR(fastify);
    }
    return dashboardCR;
  })
  .catch(() => {
    return null
  });

  return crResponse;
};

const createDashboardCR = (fastify: KubeFastifyInstance): Promise<DashboardConfig[]> => {
  const createResponse: Promise<DashboardConfig[]> = fastify.kube.customObjectsApi
  .createNamespacedCustomObject(
    'opendatahub.io',
    'v1alpha',
    fastify.kube.namespace,
    'odhdashboards',
    blankDashboardCR,
  )
  .then((result) => [result.body])
  .catch(() => null);

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
      console.log(`ERROR: `, e.body.message);
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

const fetchApplicationDefs = async (fastify: KubeFastifyInstance): Promise<OdhApplication[]> => {
  const normalizedPath = path.join(__dirname, '../../../data/applications');
  const applicationDefs: OdhApplication[] = [];
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

  const enabledAppsCMData: { [key: string]: string } = {};
  let changed = false;

  // fetch enabled apps configmap
  const coreV1Api = fastify.kube.coreV1Api;
  const namespace = fastify.kube.namespace;
  const enabledAppsCM: V1ConfigMap = await coreV1Api
    .readNamespacedConfigMap(enabledAppsConfigMapName, namespace)
    .then((result) => result.body)
    .catch(() => null);

  for (const appDef of applicationDefs) {
    appDef.spec.getStartedLink = getRouteForClusterId(fastify, appDef.spec.getStartedLink);
    appDef.spec.shownOnEnabledPage = enabledAppsCM?.data[appDef.metadata.name] === 'true'; // check cm isEnabled
    appDef.spec.isEnabled = await getIsAppEnabled(fastify, appDef);
    if (appDef.spec.isEnabled) {
      if (!appDef.spec.shownOnEnabledPage) {
        changed = true;
        appDef.spec.shownOnEnabledPage = true;
        enabledAppsCMData[appDef.metadata.name] = 'true';
      }
    }
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

  return Promise.resolve(applicationDefs);
};

const fetchDocs = async (fastify: KubeFastifyInstance): Promise<OdhDocument[]> => {
  const normalizedPath = path.join(__dirname, '../../../data/docs');
  const docs: OdhDocument[] = [];
  const featureFlags = getComponentFeatureFlags();
  const appDefs = await fetchApplicationDefs(fastify);

  fs.readdirSync(normalizedPath).forEach((file) => {
    if (yamlRegExp.test(file)) {
      try {
        const doc: OdhDocument = jsYaml.load(
          fs.readFileSync(path.join(normalizedPath, file), 'utf8'),
        );
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
  appWatcher = new ResourceWatcher<OdhApplication>(fastify, fetchApplicationDefs);
  docWatcher = new ResourceWatcher<OdhDocument>(fastify, fetchDocs);
  buildsWatcher = new ResourceWatcher<BuildStatus>(fastify, fetchBuilds, getRefreshTimeForBuilds);
  consoleLinksWatcher = new ResourceWatcher<ConsoleLinkKind>(fastify, fetchConsoleLinks);
};

export const getDashboardConfig = (): DashboardConfig => {
  const config = dashboardConfigWatcher.getResources()?.[0];
  return config
};

export const getSubscriptions = (): SubscriptionKind[] => {
  return subscriptionWatcher.getResources();
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

export const getBuildStatuses = (): BuildStatus[] => {
  return buildsWatcher.getResources();
};

export const getConsoleLinks = (): ConsoleLinkKind[] => {
  return consoleLinksWatcher.getResources();
};
