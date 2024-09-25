import * as _ from 'lodash';
import createError from 'http-errors';
import { PatchUtils, V1ConfigMap, V1Namespace, V1NamespaceList } from '@kubernetes/client-node';
import {
  AcceleratorProfileKind,
  BuildPhase,
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
  SubscriptionStatusData,
  Template,
  TolerationEffect,
  TolerationOperator,
  DataScienceClusterKindStatus,
} from '../types';
import {
  DEFAULT_ACTIVE_TIMEOUT,
  DEFAULT_INACTIVE_TIMEOUT,
  ResourceWatcher,
  ResourceWatcherTimeUpdate,
} from './resourceWatcher';
import { getComponentFeatureFlags } from './features';
import { blankDashboardCR } from './constants';
import { getIsAppEnabled, getRouteForApplication, getRouteForClusterId } from './componentUtils';
import { createCustomError } from './requestUtils';
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
let clusterStatusWatcher: ResourceWatcher<DataScienceClusterKindStatus>;
let subscriptionWatcher: ResourceWatcher<SubscriptionStatusData>;
let appWatcher: ResourceWatcher<OdhApplication>;
let docWatcher: ResourceWatcher<OdhDocument>;
let kfDefWatcher: ResourceWatcher<KfDefApplication>;
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
  return fetchOrCreateDashboardCR(fastify)
    .then(softDisableBiasMetrics(fastify))
    .then((dashboardCR) => [dashboardCR]);
};

const fetchWatchedClusterStatus = async (
  fastify: KubeFastifyInstance,
): Promise<DataScienceClusterKindStatus[]> => {
  return fetchClusterStatus(fastify).then((clusterStatus) => [clusterStatus]);
};

/**
 * TODO: Support Bias Metrics https://issues.redhat.com/browse/RHOAIENG-13084
 * For RHOAI Only
 * Always disable bias metrics until we can properly support the new UI flow.
 * Note: This does no changes to the on-cluster value -- there can be a de-sync
 */
const softDisableBiasMetrics =
  (fastify: KubeFastifyInstance) =>
  (dashboardConfig: DashboardConfig): DashboardConfig & { status?: object } => {
    if (!isRHOAI(fastify)) {
      return dashboardConfig;
    }

    fastify.log.info(
      'Trusty Bias Metrics are explicitly disabled in the cached odh-dashboard-config',
    );
    return {
      ...dashboardConfig,
      spec: {
        ...dashboardConfig.spec,
        dashboardConfig: {
          ...dashboardConfig.spec.dashboardConfig,
          disableBiasMetrics: true,
        },
      },
      // NOTE: This is a fake status to help show in the UI that we are overriding the value
      // The CRD does not support a status property today and should not have existing statuses here
      // No code should use this -- this is purely for debugging in the UI
      // To be removed as soon as we can support trusty properly
      status: {
        conditions: [
          {
            message: 'This feature flag state is being ignored',
            reason: 'IgnoredFeatureFlag',
            status: 'False',
            type: 'disableBiasMetricsAvailable',
          },
        ],
      },
    };
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
      if (
        dashboardCR &&
        dashboardCR.spec.dashboardConfig.disableKServe === undefined &&
        dashboardCR.spec.dashboardConfig.disableModelMesh === undefined
      ) {
        // return a merge between dashboardCR and blankDashboardCR but changing spec.disableKServe to true and spec.disableModelMesh to false
        return _.merge({}, blankDashboardCR, dashboardCR, {
          spec: {
            dashboardConfig: {
              disableKServe: true,
              disableModelMesh: false,
            },
          },
        });
      }
      return _.merge({}, blankDashboardCR, dashboardCR); // merge with blank CR to prevent any missing values
    })
    .catch((e) => {
      fastify.log.warn(
        `Received error (${e.body.message}) fetching OdhDashboardConfig, creating new.`,
      );
      return createDashboardCR(fastify);
    });
};

const createDashboardCR = (fastify: KubeFastifyInstance): Promise<DashboardConfig> => {
  return fastify.kube.customObjectsApi
    .createNamespacedCustomObject(
      DASHBOARD_CONFIG.group,
      DASHBOARD_CONFIG.version,
      fastify.kube.namespace,
      DASHBOARD_CONFIG.plural,
      blankDashboardCR,
    )
    .then((result) => [result.body])
    .catch((e) => {
      fastify.log.error('Error creating Dashboard CR: ', e);
      return null;
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

/** @deprecated -- we are moving away from KfDefs */
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
    const errorResponse = e.response.body;
    if (errorResponse?.trim() === '404 page not found') {
      // 404s like this are because the CRD does not exist
      // If there were no resources, we would get an empty array
      // This is not an error case, we are supporting the new Operator that does not use KfDefs
      fastify.log.info('Detected no KfDef CRD installed -- suppressing issue pulling KfDef');
      return [];
    }

    // Old flow, if it fails in other ways, we'll need to still handle a failed KfDef issue
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

export const initializeWatchedResources = (fastify: KubeFastifyInstance): void => {
  dashboardConfigWatcher = new ResourceWatcher<DashboardConfig>(fastify, fetchDashboardCR);
  clusterStatusWatcher = new ResourceWatcher<DataScienceClusterKindStatus>(
    fastify,
    fetchWatchedClusterStatus,
  );
  subscriptionWatcher = new ResourceWatcher<SubscriptionStatusData>(fastify, fetchSubscriptions);
  kfDefWatcher = new ResourceWatcher<KfDefApplication>(fastify, fetchInstalledKfdefs);
  appWatcher = new ResourceWatcher<OdhApplication>(fastify, fetchApplications);
  docWatcher = new ResourceWatcher<OdhDocument>(fastify, fetchDocs);
  quickStartWatcher = new ResourceWatcher<QuickStart>(fastify, fetchQuickStarts);
  buildsWatcher = new ResourceWatcher<BuildStatus>(fastify, fetchBuilds, getRefreshTimeForBuilds);
  consoleLinksWatcher = new ResourceWatcher<ConsoleLinkKind>(fastify, fetchConsoleLinks);
};

const FEATURE_FLAGS_HEADER = 'x-odh-feature-flags';

// if inspecting feature flags, provide the request to ensure overridden feature flags are considered
export const getDashboardConfig = (request?: FastifyRequest): DashboardConfig => {
  const dashboardConfig = dashboardConfigWatcher.getResources()?.[0];
  if (request) {
    const flagsHeader = request.headers[FEATURE_FLAGS_HEADER];
    if (typeof flagsHeader === 'string') {
      try {
        const featureFlags = JSON.parse(flagsHeader);
        return {
          ...dashboardConfig,
          spec: {
            ...dashboardConfig.spec,
            dashboardConfig: {
              ...dashboardConfig.spec.dashboardConfig,
              ...featureFlags,
            },
          },
        };
      } catch {
        // ignore
      }
    }
  }
  return dashboardConfig;
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

/**
 * Converts GPU usage to use accelerator by adding an accelerator profile CRD to the cluster if GPU usage is detected
 */
export const cleanupGPU = async (fastify: KubeFastifyInstance): Promise<void> => {
  // When we startup — in kube.ts we can handle a migration (catch ALL promise errors — exit gracefully and use fastify logging)
  // Check for migration-gpu-status configmap in dashboard namespace — if found, exit early
  const CONFIG_MAP_NAME = 'migration-gpu-status';

  const continueProcessing = await fastify.kube.coreV1Api
    .readNamespacedConfigMap(CONFIG_MAP_NAME, fastify.kube.namespace)
    .then(() => {
      // Found configmap, not continuing
      fastify.log.info(`GPU migration already completed, skipping`);
      return false;
    })
    .catch((e) => {
      if (e.statusCode === 404) {
        // No config saying we have already migrated gpus, continue
        return true;
      } else {
        throw `fetching gpu migration configmap had a ${e.statusCode} error: ${
          e.response?.body?.message || e?.response?.statusMessage
        }`;
      }
    });

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

    // Create configmap to flag operation as successful
    const configMap = {
      metadata: {
        name: CONFIG_MAP_NAME,
        namespace: fastify.kube.namespace,
      },
      data: {
        migratedCompleted: 'true',
      },
    };

    await fastify.kube.coreV1Api
      .createNamespacedConfigMap(fastify.kube.namespace, configMap)
      .then(() => fastify.log.info('Successfully migrated GPUs to accelerator profiles'))
      .catch((e) => {
        throw `A ${e.statusCode} error occurred when trying to create gpu migration configmap: ${
          e.response?.body?.message || e?.response?.statusMessage
        }`;
      });
  }
};
/**
 * @deprecated - Look to remove asap (see comments below)
 * Converts namespaces that have a display-name annotation suffixed with `[DSP]` over to using a label.
 * This is migration code from 1.19 to 1.20+. When customers are no longer on 1.19, we should remove
 * this code.
 */
export const cleanupDSPSuffix = async (fastify: KubeFastifyInstance): Promise<void> => {
  const CONFIG_MAP_NAME = 'dsg-prune-flag';

  const continueProcessing = await fastify.kube.coreV1Api
    .readNamespacedConfigMap(CONFIG_MAP_NAME, fastify.kube.namespace)
    .then(() => {
      // Found configmap, we're note continuing
      return false;
    })
    .catch((e) => {
      if (e.statusCode === 404) {
        // No config saying we have already pruned settings
        return true;
      }
      throw e;
    });

  if (continueProcessing) {
    const configMap: V1ConfigMap = {
      metadata: {
        name: CONFIG_MAP_NAME,
        namespace: fastify.kube.namespace,
      },
      data: {
        startedPrune: 'true',
      },
    };
    await fastify.kube.coreV1Api
      .createNamespacedConfigMap(fastify.kube.namespace, configMap)
      .then(() => fastify.log.info('Successfully created prune setting'))
      .catch((e) => {
        throw createCustomError(
          'Unable to create DSG prune setting configmap',
          e.response?.body?.message || e.message,
        );
      });
  } else {
    // Already processed, exit early and save the processing
    return;
  }

  let namespaces: V1Namespace[] = [];

  let continueValue: string | undefined = undefined;
  do {
    const listNamespaces: V1NamespaceList = await fastify.kube.coreV1Api
      .listNamespace(undefined, undefined, continueValue, undefined, undefined, 100)
      .then((response) => response.body);

    const {
      metadata: { _continue: continueProp },
      items,
    } = listNamespaces;

    namespaces = namespaces.concat(items);
    continueValue = continueProp;
  } while (continueValue);

  const SUFFIX = '[DSP]';

  const toChangeNamespaces = namespaces.filter(
    (namespace) =>
      // Don't touch any openshift or kube namespaces
      !(
        namespace.metadata.name.startsWith('openshift') ||
        namespace.metadata.name.startsWith('kube')
      ) &&
      // Just get the namespaces who are suffixed so we can convert them
      namespace.metadata.annotations?.['openshift.io/display-name']?.endsWith(SUFFIX),
  );

  if (toChangeNamespaces.length === 0) {
    return;
  }

  fastify.log.info(`Updating ${toChangeNamespaces.length} Namespace(s) over to DSG with labels.`);

  const data = (namespace: V1Namespace) => {
    const displayName = namespace.metadata.annotations['openshift.io/display-name'];

    return {
      metadata: {
        annotations: {
          'openshift.io/display-name': displayName.slice(0, displayName.length - SUFFIX.length),
        },
        labels: {
          'opendatahub.io/dashboard': 'true',
        },
      },
    };
  };

  const calls = toChangeNamespaces.map((namespace) =>
    fastify.kube.coreV1Api
      .patchNamespace(
        namespace.metadata.name,
        data(namespace),
        undefined,
        undefined,
        undefined,
        undefined,
        {
          headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH },
        },
      )
      .then(() => fastify.log.info(`Converted ${namespace.metadata.name} over to using labels.`)),
  );

  Promise.all(calls).then(() => {
    fastify.log.info('Completed updating Namespaces');
  });
};

/**
 * TODO: There should be a better way to go about this... but the namespace is unlikely to ever change
 */
export const isRHOAI = (fastify: KubeFastifyInstance): boolean =>
  fastify.kube.namespace === 'redhat-ods-applications';

export const getServingRuntimeNameFromTemplate = (template: Template): string =>
  template.objects[0].metadata.name;

export const translateDisplayNameForK8s = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/\s/g, '-')
    .replace(/[^A-Za-z0-9-]/g, '');
