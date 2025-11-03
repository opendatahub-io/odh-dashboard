import * as _ from 'lodash';
import { V1ConfigMap, V1Role, V1RoleBinding, V1RoleBindingList } from '@kubernetes/client-node';
import {
  AcceleratorProfileKind,
  BuildPhase,
  BuildKind,
  BuildStatus,
  ConsoleLinkKind,
  CSVKind,
  DashboardConfig,
  K8sResourceCommon,
  KubeFastifyInstance,
  OdhApplication,
  OdhDocument,
  QuickStart,
  SubscriptionKind,
  SubscriptionStatusData,
  Template,
  TolerationEffect,
  TolerationOperator,
  DataScienceClusterKindStatus,
  KnownLabels,
  AuthKind,
  OdhPlatformType,
} from '../types';
import {
  DEFAULT_ACTIVE_TIMEOUT,
  DEFAULT_INACTIVE_TIMEOUT,
  ResourceWatcher,
  ResourceWatcherTimeUpdate,
} from './resourceWatcher';
import { getComponentFeatureFlags } from './features';
import { blankDashboardCR } from './constants';
import { getLink, getRouteForClusterId, getServiceLink } from './componentUtils';
import { isHttpError } from '../utils';
import { getDetectedAccelerators } from '../routes/api/accelerators/acceleratorUtils';
import { FastifyRequest } from 'fastify';
import { fetchClusterStatus } from './dsc';

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
let authWatcher: ResourceWatcher<AuthKind>;
let clusterStatusWatcher: ResourceWatcher<DataScienceClusterKindStatus>;
let subscriptionWatcher: ResourceWatcher<SubscriptionStatusData>;
let appWatcher: ResourceWatcher<OdhApplication>;
let docWatcher: ResourceWatcher<OdhDocument>;
let buildsWatcher: ResourceWatcher<BuildStatus>;
let consoleLinksWatcher: ResourceWatcher<ConsoleLinkKind>;
let quickStartWatcher: ResourceWatcher<QuickStart>;

const DASHBOARD_CONFIG = {
  group: 'opendatahub.io',
  version: 'v1alpha',
  plural: 'odhdashboardconfigs',
  dashboardName: process.env['DASHBOARD_CONFIG'] || dashboardConfigMapName,
};

const fetchDashboardCR = async (fastify: KubeFastifyInstance): Promise<DashboardConfig[]> => {
  return fetchOrCreateDashboardCR(fastify).then((dashboardCR) => [dashboardCR]);
};

const fetchWatchedClusterStatus = async (
  fastify: KubeFastifyInstance,
): Promise<DataScienceClusterKindStatus[]> => {
  return fetchClusterStatus(fastify).then((clusterStatus) => [clusterStatus]);
};

const fetchOrCreateDashboardCR = async (fastify: KubeFastifyInstance): Promise<DashboardConfig> => {
  return fastify.kube.customObjectsApi
    .getNamespacedCustomObject(
      DASHBOARD_CONFIG.group,
      DASHBOARD_CONFIG.version,
      fastify.kube.namespace,
      DASHBOARD_CONFIG.plural,
      DASHBOARD_CONFIG.dashboardName,
    )
    .then((res) => {
      const dashboardCR = res?.body as DashboardConfig;
      return _.merge({}, blankDashboardCR, dashboardCR); // merge with blank CR to prevent any missing values
    })
    .catch((e) => {
      fastify.log.warn(
        `Received error (${e.body.message}) fetching OdhDashboardConfig, creating new.`,
      );
      return createDashboardCR(fastify);
    });
};

// Do not contain any feature flags -- code overrides will do their trick until managed by users
const defaultDashboardCR = _.omit(blankDashboardCR, 'spec.dashboardConfig');
const createDashboardCR = (fastify: KubeFastifyInstance): Promise<DashboardConfig> => {
  return fastify.kube.customObjectsApi
    .createNamespacedCustomObject(
      DASHBOARD_CONFIG.group,
      DASHBOARD_CONFIG.version,
      fastify.kube.namespace,
      DASHBOARD_CONFIG.plural,
      defaultDashboardCR,
    )
    .then((result) => result.body as DashboardConfig)
    .catch((e) => {
      fastify.log.error(e, 'Error creating Dashboard CR: ');
      return defaultDashboardCR;
    });
};

const fetchSubscriptions = (fastify: KubeFastifyInstance): Promise<SubscriptionStatusData[]> => {
  const fetchAll = async (): Promise<SubscriptionStatusData[]> => {
    const installedCSVs: SubscriptionStatusData[] = [];
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
            metadata: { continue: string; remainingItemCount: number };
          };
        };
        const subs = res?.body.items?.map((sub) => ({
          channel: sub.spec.channel,
          installedCSV: sub.status?.installedCSV,
          installPlanRefNamespace: sub.status?.installPlanRef?.namespace,
          lastUpdated: sub.status.lastUpdated,
        }));
        remainingItemCount = res.body?.metadata?.remainingItemCount;
        _continue = res.body?.metadata?.continue;
        if (subs?.length) {
          installedCSVs.push(...subs);
        }
      }
    } catch (e) {
      console.error(`ERROR: `, e.body.message);
    }
    return installedCSVs;
  };
  return fetchAll();
};

const fetchQuickStarts = async (fastify: KubeFastifyInstance): Promise<QuickStart[]> => {
  const fetchAll = async (): Promise<QuickStart[]> => {
    const installedQuickStarts: QuickStart[] = [];
    const appDefs = await fetchApplicationDefs(fastify);
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

        qStarts.forEach((qStart) => {
          if (qStart.spec.featureFlag) {
            if (
              featureFlags[qStart.spec.featureFlag] &&
              appDefs.find((def) => def.metadata.name === qStart.spec.appName)
            ) {
              installedQuickStarts.push(qStart);
            }
            return;
          }
          if (appDefs.find((def) => def.metadata.name === qStart.spec.appName)) {
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
    if (isIntegrationApp(appDef)) {
      // Ignore logic for apps that use internal routes for status information
      applications.push(appDef);
    } else {
      appDef.spec.shownOnEnabledPage = enabledAppsCM?.data?.[appDef.metadata.name] === 'true';
      appDef.spec.isEnabled = await getIsAppEnabled(fastify, appDef).catch((e) => {
        fastify.log.warn(
          `"${
            appDef.metadata.name
          }" OdhApplication is being disabled due to an error determining if it's enabled. ${
            e.response?.body?.message || e.message
          }`,
        );

        return false;
      });
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
          if (doc.spec.featureFlag) {
            if (
              featureFlags[doc.spec.featureFlag] &&
              appDefs.find((def) => def.metadata.name === doc.spec.appName)
            ) {
              docs.push(doc);
            }
            return;
          }
          if (appDefs.find((def) => def.metadata.name === doc.spec.appName)) {
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

const PENDING_PHASES = [BuildPhase.new, BuildPhase.pending, BuildPhase.cancelled];

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
          status: BuildPhase.none,
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
        status: BuildPhase.pending,
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

const fetchAuthKind = (fastify: KubeFastifyInstance): Promise<AuthKind[]> => {
  return fastify.kube.customObjectsApi
    .getClusterCustomObject('services.platform.opendatahub.io', 'v1alpha1', 'auths', 'auth')
    .then((response) => response.body as AuthKind)
    .then((auth) => [auth]);
};

export const initializeWatchedResources = (fastify: KubeFastifyInstance): void => {
  dashboardConfigWatcher = new ResourceWatcher<DashboardConfig>(fastify, fetchDashboardCR);
  authWatcher = new ResourceWatcher<AuthKind>(fastify, fetchAuthKind);
  clusterStatusWatcher = new ResourceWatcher<DataScienceClusterKindStatus>(
    fastify,
    fetchWatchedClusterStatus,
  );
  subscriptionWatcher = new ResourceWatcher<SubscriptionStatusData>(fastify, fetchSubscriptions);
  appWatcher = new ResourceWatcher<OdhApplication>(fastify, fetchApplications);
  docWatcher = new ResourceWatcher<OdhDocument>(fastify, fetchDocs);
  quickStartWatcher = new ResourceWatcher<QuickStart>(fastify, fetchQuickStarts);
  buildsWatcher = new ResourceWatcher<BuildStatus>(fastify, fetchBuilds, getRefreshTimeForBuilds);
  consoleLinksWatcher = new ResourceWatcher<ConsoleLinkKind>(fastify, fetchConsoleLinks);
};

/**
 * Sometimes we need to lockout a feature while we look to remove it more properly. This function
 * can help align the feature to being disabled.
 */
const applyFeatureLockouts = (config: DashboardConfig): DashboardConfig => ({
  ...config,
  spec: {
    ...config.spec,
    dashboardConfig: {
      ...config.spec.dashboardConfig,
      // Apply Feature Lockouts Directly below
      // Feature flags noted below are removable from the CRD at the earliest convenience
      // Do note, update the CRD is a backwards incompatible step and needs an up-version
      //---------------------------------------

      /**
       * Model Mesh is removed in v3.0
       */
      disableModelMesh: true,
    },
  },
});

const FEATURE_FLAGS_HEADER = 'x-odh-feature-flags';

// if inspecting feature flags, provide the request to ensure overridden feature flags are considered
export const getDashboardConfig = (request?: FastifyRequest): DashboardConfig => {
  const dashboardConfig = dashboardConfigWatcher.getResources()?.[0];
  if (request) {
    const flagsHeader = request.headers[FEATURE_FLAGS_HEADER];
    if (typeof flagsHeader === 'string') {
      try {
        const featureFlags = JSON.parse(flagsHeader);
        return applyFeatureLockouts({
          ...dashboardConfig,
          spec: {
            ...dashboardConfig.spec,
            dashboardConfig: {
              ...dashboardConfig.spec.dashboardConfig,
              ...featureFlags,
            },
          },
        });
      } catch {
        // ignore
      }
    }
  }
  return applyFeatureLockouts(dashboardConfig);
};

export const getClusterStatus = (
  fastify: KubeFastifyInstance,
): DataScienceClusterKindStatus | undefined => {
  const clusterStatus = clusterStatusWatcher.getResources()?.[0];
  if (!clusterStatus) {
    fastify.log.error('Tried to use DSC before ResourceWatcher could successfully fetch it');
  }
  return clusterStatus;
};

export const updateDashboardConfig = (): Promise<void> => {
  return dashboardConfigWatcher.updateResults();
};

export const getSubscriptions = (): SubscriptionStatusData[] => {
  return subscriptionWatcher.getResources();
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

export const getAuth = (): AuthKind => {
  return authWatcher.getResources()[0];
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

const getConsoleLinkRoute = (appDef: OdhApplication): string => {
  if (!appDef.spec.consoleLink) {
    return null;
  }
  const consoleLink = getConsoleLinks().find((cl) => cl.metadata.name === appDef.spec.consoleLink);
  return consoleLink ? consoleLink.spec.href : null;
};

export const checkJupyterEnabled = (): boolean =>
  getDashboardConfig().spec.notebookController?.enabled !== false;

export const getApplicationEnabledConfigMap = async (
  fastify: KubeFastifyInstance,
  appDef: OdhApplication,
): Promise<boolean> => {
  const namespace = fastify.kube.namespace;
  const name = appDef.spec.enable?.validationConfigMap;
  if (!name) {
    return Promise.resolve(null);
  }
  const coreV1Api = fastify.kube.coreV1Api;
  const enabledCM = await coreV1Api
    .readNamespacedConfigMap(name, namespace)
    .then((result) => result.body)
    .catch(() => null);
  if (!enabledCM) {
    return false;
  }
  return enabledCM.data?.validation_result === 'true';
};

const getField = (obj: any, path: string, defaultValue: string = undefined): string => {
  const travel = (regexp: RegExp) =>
    String.prototype.split
      .call(path, regexp)
      .filter(Boolean)
      .reduce((res: any, key: string) => (res !== null && res !== undefined ? res[key] : res), obj);
  const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
  return result === undefined || result === obj ? defaultValue : result;
};

const getCREnabledForApp = (
  fastify: KubeFastifyInstance,
  appDef: OdhApplication,
): Promise<boolean> => {
  const { enableCR } = appDef.spec;
  if (!enableCR) {
    return undefined;
  }

  const customObjectsApi = fastify.kube.customObjectsApi;
  const namespace = enableCR.namespace || fastify.kube.namespace;
  const { group, version, plural, name } = enableCR;
  return customObjectsApi
    .getNamespacedCustomObject(group, version, namespace, plural, name)
    .then((res) => {
      const existingCR = res.body;
      if (!enableCR) {
        return false;
      }
      return getField(existingCR, appDef.spec.enableCR.field) === appDef.spec.enableCR.value;
    })
    .catch(() => false);
};

const getCSVForApp = (
  fastify: KubeFastifyInstance,
  app: OdhApplication,
): Promise<K8sResourceCommon | undefined> => {
  if (!app.spec.csvName) {
    return Promise.resolve(undefined);
  }

  const subsStatus = getSubscriptions();
  const subStatus = subsStatus.find((st) => st.installedCSV?.startsWith(app.spec.csvName));

  if (!subStatus) {
    return Promise.resolve(undefined);
  }

  const installedCSV = subStatus.installedCSV;

  if (!installedCSV) {
    return Promise.resolve(undefined);
  }

  const namespace = subStatus.installPlanRefNamespace;
  if (!namespace) {
    return Promise.resolve(undefined);
  }

  return fastify.kube.customObjectsApi
    .getNamespacedCustomObject(
      'operators.coreos.com',
      'v1alpha1',
      namespace,
      'clusterserviceversions',
      installedCSV,
    )
    .then((response) => {
      const csv = response.body as CSVKind;
      if (csv.status?.phase === 'Succeeded') {
        return csv;
      }
      return undefined;
    })
    .catch((e) => {
      if (isHttpError(e) && e.statusCode === 404) {
        // eslint-disable-next-line no-console
        console.error(e);
        return undefined;
      }
      throw e;
    });
};

export const getIsAppEnabled = async (
  fastify: KubeFastifyInstance,
  appDef: OdhApplication,
): Promise<boolean> => {
  if (appDef.spec.category === 'Red Hat managed') {
    return true;
  }

  const enabledCM = await getApplicationEnabledConfigMap(fastify, appDef);
  if (enabledCM) {
    return true;
  }
  const crEnabled = await getCREnabledForApp(fastify, appDef);
  if (crEnabled) {
    return true;
  }

  if (await getCSVForApp(fastify, appDef)) {
    return true;
  }

  return false;
};

export const getRouteForApplication = async (
  fastify: KubeFastifyInstance,
  app: OdhApplication,
): Promise<string> => {
  let route = getRouteForClusterId(fastify, app.spec.endpoint);
  if (route) {
    return route;
  }

  route = await getLink(fastify, app.spec.route);
  if (route) {
    return route;
  }

  const operatorCSV = await getCSVForApp(fastify, app);
  route = await getLink(
    fastify,
    app.spec.route,
    app.spec.routeNamespace || operatorCSV?.metadata.namespace,
    app.spec.routeSuffix,
  );
  if (route) {
    return route;
  }

  route = getConsoleLinkRoute(app);
  if (route) {
    return route;
  }

  route = await getServiceLink(fastify, app.spec.serviceName, app.spec.routeSuffix);
  return route;
};

const shouldMigrationContinue = async (
  fastify: KubeFastifyInstance,
  configMapName: string,
  description: string,
): Promise<boolean> =>
  fastify.kube.coreV1Api
    .readNamespacedConfigMap(configMapName, fastify.kube.namespace)
    .then(() => {
      // Found configmap, not continuing
      fastify.log.info(`${description} migration already completed, skipping`);
      return false;
    })
    .catch((e) => {
      if (e.statusCode === 404) {
        // No config saying we have already migrated, continue
        return true;
      }
      throw `fetching ${description} migration configmap had a ${e.statusCode} error: ${
        e.response?.body?.message || e?.response?.statusMessage
      }`;
    });

const createSuccessfulMigrationConfigMap = async (
  fastify: KubeFastifyInstance,
  configMapName: string,
  description: string,
): Promise<void> => {
  // Create configmap to flag operation as successful
  const configMap: V1ConfigMap = {
    metadata: {
      name: configMapName,
      namespace: fastify.kube.namespace,
    },
    data: {
      migratedCompleted: 'true',
    },
  };
  return await fastify.kube.coreV1Api
    .createNamespacedConfigMap(fastify.kube.namespace, configMap)
    .then(() => fastify.log.info(`Successfully migrated ${description}`))
    .catch((e) => {
      throw `A ${
        e.statusCode
      } error occurred when trying to create configmap for ${description} migration: ${
        e.response?.body?.message || e?.response?.statusMessage
      }`;
    });
};

export const cleanupKserveRoleBindings = async (fastify: KubeFastifyInstance): Promise<void> => {
  // When we startup — in kube.ts we can handle a migration (catch ALL promise errors — exit gracefully and use fastify logging)
  // Check for migration-kserve-inferenceservices-role configmap in dashboard namespace — if found, exit early
  const CONFIG_MAP_NAME = 'migration-kserve-inferenceservices-role';
  const DESCRIPTION = 'KServe secure rolebindings';

  const continueProcessing = await shouldMigrationContinue(fastify, CONFIG_MAP_NAME, DESCRIPTION);

  if (continueProcessing) {
    const roleBindings = await fastify.kube.customObjectsApi.listClusterCustomObject(
      'rbac.authorization.k8s.io',
      'v1',
      'rolebindings',
      undefined,
      undefined,
      undefined,
      `${KnownLabels.DASHBOARD_RESOURCE} = true`,
    );
    const kserveSARoleBindings =
      (roleBindings?.body as V1RoleBindingList).items?.filter(
        ({ roleRef, subjects, metadata }) =>
          roleRef.kind === 'ClusterRole' &&
          roleRef.name === 'view' &&
          subjects.length === 1 &&
          subjects[0].kind === 'ServiceAccount' &&
          metadata?.ownerReferences.length === 1 &&
          metadata?.ownerReferences[0].kind === 'InferenceService',
      ) || [];

    const replaceRoleBinding = async (existingRoleBinding: V1RoleBinding) => {
      const inferenceServiceName = existingRoleBinding.metadata?.ownerReferences[0].name;
      const namespace = existingRoleBinding.metadata?.namespace;
      const newRoleBindingName = `${inferenceServiceName}-view`;
      const newRoleName = `${inferenceServiceName}-view-role`;

      const newRole: V1Role = {
        apiVersion: 'rbac.authorization.k8s.io/v1',
        kind: 'Role',
        metadata: {
          name: newRoleName,
          namespace,
          labels: {
            [KnownLabels.DASHBOARD_RESOURCE]: 'true',
          },
        },
        rules: [
          {
            verbs: ['get'],
            apiGroups: ['serving.kserve.io'],
            resources: ['inferenceservices'],
            resourceNames: [inferenceServiceName],
          },
        ],
      };

      const newRoleBinding: V1RoleBinding = {
        kind: 'RoleBinding',
        apiVersion: 'rbac.authorization.k8s.io/v1',
        metadata: {
          name: newRoleBindingName,
          namespace,
          labels: existingRoleBinding.metadata?.labels,
          ownerReferences: existingRoleBinding.metadata?.ownerReferences,
        },
        subjects: existingRoleBinding.subjects,
        roleRef: {
          apiGroup: 'rbac.authorization.k8s.io',
          kind: 'Role',
          name: newRoleName,
        },
      };

      // Create new role if it doesn't already exist
      await fastify.kube.customObjectsApi
        .getNamespacedCustomObject(
          'rbac.authorization.k8s.io',
          'v1',
          namespace,
          'roles',
          newRoleName,
        )
        .catch((e) => {
          if (e.statusCode === 404) {
            return fastify.kube.customObjectsApi.createNamespacedCustomObject(
              'rbac.authorization.k8s.io',
              'v1',
              namespace,
              'roles',
              newRole,
            );
          }
        });

      // Delete and replace old RB because we can't patch rolebindings
      await fastify.kube.customObjectsApi.deleteNamespacedCustomObject(
        'rbac.authorization.k8s.io',
        'v1',
        namespace,
        'rolebindings',
        existingRoleBinding?.metadata.name,
      );
      await fastify.kube.customObjectsApi.createNamespacedCustomObject(
        'rbac.authorization.k8s.io',
        'v1',
        namespace,
        'rolebindings',
        newRoleBinding,
      );
    };

    await Promise.all(kserveSARoleBindings.map(replaceRoleBinding));

    await createSuccessfulMigrationConfigMap(fastify, CONFIG_MAP_NAME, DESCRIPTION);
  }
};

/**
 * Converts GPU usage to use accelerator by adding an accelerator profile CRD to the cluster if GPU usage is detected
 */
// TODO copy this approach for migrating for https://issues.redhat.com/browse/RHOAIENG-11010
export const cleanupGPU = async (fastify: KubeFastifyInstance): Promise<void> => {
  // When we startup — in kube.ts we can handle a migration (catch ALL promise errors — exit gracefully and use fastify logging)
  // Check for migration-gpu-status configmap in dashboard namespace — if found, exit early
  const CONFIG_MAP_NAME = 'migration-gpu-status';
  const DESCRIPTION = 'GPU';

  const continueProcessing = await shouldMigrationContinue(fastify, CONFIG_MAP_NAME, DESCRIPTION);

  if (continueProcessing) {
    // Read existing AcceleratorProfiles
    const acceleratorProfilesResponse = await fastify.kube.customObjectsApi
      .listNamespacedCustomObject(
        'dashboard.opendatahub.io',
        'v1',
        fastify.kube.namespace,
        'acceleratorprofiles',
      )
      .catch((e) => {
        console.log(e);
        // If error shows up — CRD may not be installed, exit early
        throw `A ${e.statusCode} error occurred when trying to fetch accelerator profiles: ${
          e.response?.body?.message || e?.response?.statusMessage
        }`;
      });

    const acceleratorProfiles = (
      acceleratorProfilesResponse?.body as {
        items: AcceleratorProfileKind[];
      }
    )?.items;

    // If not error and no profiles detected:
    if (
      acceleratorProfiles &&
      Array.isArray(acceleratorProfiles) &&
      acceleratorProfiles.length === 0
    ) {
      // if gpu detected on cluster, create our default migrated-gpu
      const acceleratorDetected = await getDetectedAccelerators(fastify);
      const hasNvidiaNodes = Object.keys(acceleratorDetected.total).some(
        (nodeKey) => nodeKey === 'nvidia.com/gpu',
      );

      if (acceleratorDetected.configured && hasNvidiaNodes) {
        const payload: AcceleratorProfileKind = {
          kind: 'AcceleratorProfile',
          apiVersion: 'dashboard.opendatahub.io/v1',
          metadata: {
            name: 'migrated-gpu',
            namespace: fastify.kube.namespace,
          },
          spec: {
            displayName: 'NVIDIA GPU',
            identifier: 'nvidia.com/gpu',
            enabled: true,
            tolerations: [
              {
                effect: TolerationEffect.NO_SCHEDULE,
                key: 'nvidia.com/gpu',
                operator: TolerationOperator.EXISTS,
              },
            ],
          },
        };

        try {
          await fastify.kube.customObjectsApi.createNamespacedCustomObject(
            'dashboard.opendatahub.io',
            'v1',
            fastify.kube.namespace,
            'acceleratorprofiles',
            payload,
          );
        } catch (e) {
          // If bad detection — exit early and dont create config
          throw `A ${
            e.statusCode
          } error occurred when trying to add migrated-gpu accelerator profile: ${
            e.response?.body?.message || e?.response?.statusMessage
          }`;
        }
      }
    }

    await createSuccessfulMigrationConfigMap(fastify, CONFIG_MAP_NAME, DESCRIPTION);
  }
};

export const isRHOAI = (fastify: KubeFastifyInstance): boolean => {
  const releaseName = getClusterStatus(fastify)?.release?.name;
  return (
    releaseName === OdhPlatformType.SELF_MANAGED_RHOAI ||
    releaseName === OdhPlatformType.MANAGED_RHOAI
  );
};

export const getServingRuntimeNameFromTemplate = (template: Template): string =>
  template.objects[0].metadata.name;

export const translateDisplayNameForK8s = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/\s/g, '-')
    .replace(/[^A-Za-z0-9-]/g, '');
export const isIntegrationApp = (app: OdhApplication): boolean =>
  app.spec.internalRoute?.startsWith('/api/');
