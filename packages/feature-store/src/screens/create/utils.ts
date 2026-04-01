import {
  FeatureStoreFormData,
  RegistryType,
  PersistenceType,
  AuthzType,
  ScalingMode,
} from './types';
import {
  FeastServices,
  FeastAuthzConfig,
  FeastServerConfigs,
  FeastRegistryServerConfigs,
  FeastWorkerConfigs,
} from '../../k8sTypes';
import { FeatureStoreFormSpec } from '../../api/featureStores';
import { FEATURE_STORE_UI_LABEL_KEY, FEATURE_STORE_UI_LABEL_VALUE } from '../../const';

const buildEnvFrom = (secretName: string): Record<string, unknown>[] | undefined => {
  if (!secretName.trim()) {
    return undefined;
  }
  return [{ secretRef: { name: secretName.trim() } }];
};

const cleanWorkerConfigs = (wc: FeastWorkerConfigs | undefined): FeastWorkerConfigs | undefined => {
  if (!wc) {
    return undefined;
  }
  const cleaned: FeastWorkerConfigs = {};
  if (wc.workers != null) {
    cleaned.workers = wc.workers;
  }
  if (wc.workerConnections != null) {
    cleaned.workerConnections = wc.workerConnections;
  }
  if (wc.maxRequests != null) {
    cleaned.maxRequests = wc.maxRequests;
  }
  if (wc.maxRequestsJitter != null) {
    cleaned.maxRequestsJitter = wc.maxRequestsJitter;
  }
  if (wc.keepAliveTimeout != null) {
    cleaned.keepAliveTimeout = wc.keepAliveTimeout;
  }
  if (wc.registryTTLSeconds != null) {
    cleaned.registryTTLSeconds = wc.registryTTLSeconds;
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
};

const cleanServerConfig = (
  config: FeastServerConfigs | undefined,
): FeastServerConfigs | undefined => {
  if (!config) {
    return undefined;
  }
  const cleaned: FeastServerConfigs = {};
  if (config.logLevel) {
    cleaned.logLevel = config.logLevel;
  }
  if (config.metrics != null) {
    cleaned.metrics = config.metrics;
  }
  if (config.image) {
    cleaned.image = config.image;
  }
  if (config.resources) {
    const toRecord = (val: unknown): Record<string, string> => {
      if (val && typeof val === 'object') {
        return val as Record<string, string>; // eslint-disable-line @typescript-eslint/consistent-type-assertions
      }
      return {};
    };
    const requests = toRecord(config.resources.requests);
    const limits = toRecord(config.resources.limits);
    const cleanedRequests = Object.fromEntries(
      Object.entries(requests).filter(([, v]) => v !== ''),
    );
    const cleanedLimits = Object.fromEntries(Object.entries(limits).filter(([, v]) => v !== ''));
    const cleanedResources: Record<string, unknown> = {};
    if (Object.keys(cleanedRequests).length > 0) {
      cleanedResources.requests = cleanedRequests;
    }
    if (Object.keys(cleanedLimits).length > 0) {
      cleanedResources.limits = cleanedLimits;
    }
    if (Object.keys(cleanedResources).length > 0) {
      cleaned.resources = cleanedResources;
    }
  }
  const wc = cleanWorkerConfigs(config.workerConfigs);
  if (wc) {
    cleaned.workerConfigs = wc;
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
};

const buildServices = (data: FeatureStoreFormData): FeastServices | undefined => {
  const services: FeastServices = {};

  if (data.registryType === RegistryType.LOCAL) {
    const rawRegistryServer = data.services?.registry?.local?.server;
    const cleanedBase = cleanServerConfig(rawRegistryServer);
    const registryServer: FeastRegistryServerConfigs = {
      ...cleanedBase,
      ...(rawRegistryServer?.restAPI != null && { restAPI: rawRegistryServer.restAPI }),
      ...(rawRegistryServer?.grpc != null && { grpc: rawRegistryServer.grpc }),
    };
    const registryFilePath = data.services?.registry?.local?.persistence?.file?.path ?? '';
    const registryIsObjectStore =
      registryFilePath.startsWith('s3://') || registryFilePath.startsWith('gs://');
    if (data.registryPersistenceType === PersistenceType.FILE && registryIsObjectStore) {
      const registryEnvFrom = buildEnvFrom(data.registrySecretName);
      if (registryEnvFrom) {
        registryServer.envFrom = registryEnvFrom;
      }
    }

    const localRegistry: FeastServices['registry'] = {
      local: {
        server: Object.keys(registryServer).length > 0 ? registryServer : undefined,
      },
    };

    if (data.registryPersistenceType === PersistenceType.FILE) {
      const filePersistence = data.services?.registry?.local?.persistence?.file;
      if (
        filePersistence?.path ||
        filePersistence?.pvc ||
        filePersistence?.cache_ttl_seconds ||
        filePersistence?.cache_mode
      ) {
        localRegistry.local = {
          ...localRegistry.local,
          persistence: { file: filePersistence },
        };
      }
    } else {
      const storePersistence = data.services?.registry?.local?.persistence?.store;
      if (storePersistence?.type) {
        localRegistry.local = {
          ...localRegistry.local,
          persistence: { store: storePersistence },
        };
      }
    }

    services.registry = localRegistry;
  } else {
    services.registry = {
      remote: data.services?.registry?.remote,
    };
  }

  {
    const onlineStore: FeastServices['onlineStore'] = {};

    if (data.onlinePersistenceType === PersistenceType.FILE) {
      const filePersistence = data.services?.onlineStore?.persistence?.file;
      if (filePersistence?.path || filePersistence?.pvc) {
        onlineStore.persistence = { file: filePersistence };
      }
    } else {
      const storePersistence = data.services?.onlineStore?.persistence?.store;
      if (storePersistence?.type) {
        onlineStore.persistence = { store: storePersistence };
      }
    }

    const cleanedOnlineServer = cleanServerConfig(data.services?.onlineStore?.server);
    const onlineServer: FeastServerConfigs = cleanedOnlineServer ?? {};
    const onlineEnvFrom = buildEnvFrom(data.onlineStoreSecretName);
    if (onlineEnvFrom) {
      onlineServer.envFrom = onlineEnvFrom;
    }
    if (Object.keys(onlineServer).length > 0) {
      onlineStore.server = onlineServer;
    }

    services.onlineStore = onlineStore;
  }

  if (data.offlineStoreEnabled) {
    const offlineStore: FeastServices['offlineStore'] = {
      server: {},
    };

    if (data.offlinePersistenceType === PersistenceType.FILE) {
      const filePersistence = data.services?.offlineStore?.persistence?.file;
      if (filePersistence?.type || filePersistence?.pvc) {
        offlineStore.persistence = { file: filePersistence };
      }
    } else {
      const storePersistence = data.services?.offlineStore?.persistence?.store;
      if (storePersistence?.type) {
        offlineStore.persistence = { store: storePersistence };
      }
    }

    const cleanedOfflineServer = cleanServerConfig(data.services?.offlineStore?.server);
    const offlineServer: FeastServerConfigs = cleanedOfflineServer ?? {};
    const offlineEnvFrom = buildEnvFrom(data.offlineStoreSecretName);
    if (offlineEnvFrom) {
      offlineServer.envFrom = offlineEnvFrom;
    }
    offlineStore.server = Object.keys(offlineServer).length > 0 ? offlineServer : {};

    services.offlineStore = offlineStore;
  }

  if (data.services?.disableInitContainers) {
    services.disableInitContainers = true;
  }

  if (data.services?.runFeastApplyOnInit === false) {
    services.runFeastApplyOnInit = false;
  }

  if (data.scalingEnabled && data.scalingMode === ScalingMode.HPA) {
    services.scaling = {
      autoscaling: {
        minReplicas: data.hpaMinReplicas,
        maxReplicas: data.hpaMaxReplicas,
      },
    };
  }

  if (data.services?.podDisruptionBudgets) {
    services.podDisruptionBudgets = data.services.podDisruptionBudgets;
  }

  return Object.keys(services).length > 0 ? services : undefined;
};

const buildAuthz = (data: FeatureStoreFormData): FeastAuthzConfig | undefined => {
  if (data.authzType === AuthzType.NONE) {
    return undefined;
  }
  return data.authz;
};

export const buildFormSpec = (
  data: FeatureStoreFormData,
  addUILabel: boolean,
): FeatureStoreFormSpec => {
  const labels: Record<string, string> = {};
  if (addUILabel) {
    labels[FEATURE_STORE_UI_LABEL_KEY] = FEATURE_STORE_UI_LABEL_VALUE;
  }

  let { feastProjectDir } = data;
  if (feastProjectDir?.git && data.gitSecretName.trim()) {
    feastProjectDir = {
      ...feastProjectDir,
      git: {
        ...feastProjectDir.git,
        envFrom: [{ secretRef: { name: data.gitSecretName.trim() } }],
      },
    };
  }

  return {
    feastProject: data.feastProject,
    namespace: data.namespace,
    feastProjectDir,
    services: buildServices(data),
    authz: buildAuthz(data),
    cronJob: data.cronJob,
    batchEngine:
      data.batchEngineEnabled && data.batchEngineConfigMapName
        ? {
            configMapRef: { name: data.batchEngineConfigMapName },
            ...(data.batchEngineConfigMapKey && { configMapKey: data.batchEngineConfigMapKey }),
          }
        : undefined,
    replicas:
      data.scalingEnabled && data.scalingMode === ScalingMode.STATIC ? data.replicas : undefined,
    labels: Object.keys(labels).length > 0 ? labels : undefined,
  };
};

export const formSpecToYaml = (formSpec: FeatureStoreFormSpec): string => {
  const { namespace, labels, ...specData } = formSpec;

  const cleanSpec = JSON.parse(JSON.stringify(specData));

  const cr = {
    apiVersion: 'feast.dev/v1',
    kind: 'FeatureStore',
    metadata: {
      name: formSpec.feastProject,
      namespace,
      ...(labels && Object.keys(labels).length > 0 && { labels }),
    },
    spec: cleanSpec,
  };

  return yamlStringify(cr);
};

const yamlStringify = (obj: unknown, indent = 0): string => {
  const spaces = '  '.repeat(indent);

  if (obj === null || obj === undefined) {
    return 'null';
  }

  if (typeof obj === 'string') {
    if (obj.includes('\n') || obj.includes(':') || obj.includes('#') || obj.includes("'")) {
      return `"${obj.replace(/"/g, '\\"')}"`;
    }
    return obj;
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj);
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return '[]';
    }
    return obj
      .map((item) => {
        const itemStr = yamlStringify(item, indent + 1);
        if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
          const lines = itemStr.split('\n');
          return [`${spaces}- ${lines[0].trimStart()}`, ...lines.slice(1)].join('\n');
        }
        return `${spaces}- ${itemStr}`;
      })
      .join('\n');
  }

  if (typeof obj === 'object') {
    const entries = Object.entries(obj).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    );
    if (entries.length === 0) {
      return '{}';
    }
    return entries
      .map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          const nested = yamlStringify(value, indent + 1);
          if (nested === '{}' || nested === '[]') {
            return `${spaces}${key}: ${nested}`;
          }
          return `${spaces}${key}:\n${nested}`;
        }
        return `${spaces}${key}: ${yamlStringify(value, indent)}`;
      })
      .join('\n');
  }

  return String(obj);
};
