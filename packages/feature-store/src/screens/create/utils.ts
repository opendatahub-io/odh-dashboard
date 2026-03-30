import { FeatureStoreFormSpec } from '@odh-dashboard/internal/api/k8s/featureStores';
import { FeastServices, FeastAuthzConfig } from '@odh-dashboard/internal/k8sTypes';
import {
  FeatureStoreFormData,
  RegistryType,
  PersistenceType,
  AuthzType,
  ScalingMode,
} from './types';
import { FEATURE_STORE_UI_LABEL_KEY, FEATURE_STORE_UI_LABEL_VALUE } from '../../const';

const buildEnvFrom = (secretName: string): Record<string, unknown>[] | undefined => {
  if (!secretName.trim()) {
    return undefined;
  }
  return [{ secretRef: { name: secretName.trim() } }];
};

const buildServices = (data: FeatureStoreFormData): FeastServices | undefined => {
  const services: FeastServices = {};

  if (data.registryType === RegistryType.LOCAL) {
    const registryServer = { ...data.services?.registry?.local?.server };
    const registryEnvFrom = buildEnvFrom(data.registrySecretName);
    if (registryEnvFrom) {
      registryServer.envFrom = registryEnvFrom;
    }

    const localRegistry: FeastServices['registry'] = {
      local: {
        server: registryServer,
      },
    };

    if (data.registryPersistenceType === PersistenceType.FILE) {
      const filePersistence = data.services?.registry?.local?.persistence?.file;
      if (filePersistence?.path) {
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

  if (data.onlineStoreEnabled) {
    const onlineStore: FeastServices['onlineStore'] = {};

    if (data.onlinePersistenceType === PersistenceType.FILE) {
      const filePath = data.services?.onlineStore?.persistence?.file?.path;
      if (filePath) {
        onlineStore.persistence = { file: { path: filePath } };
      }
    } else {
      const storePersistence = data.services?.onlineStore?.persistence?.store;
      if (storePersistence?.type) {
        onlineStore.persistence = { store: storePersistence };
      }
    }

    const onlineServer = { ...data.services?.onlineStore?.server };
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
    const offlineStore: FeastServices['offlineStore'] = {};

    if (data.offlinePersistenceType === PersistenceType.FILE) {
      const filePersistence = data.services?.offlineStore?.persistence?.file;
      if (filePersistence?.type) {
        offlineStore.persistence = { file: filePersistence };
      }
    } else {
      const storePersistence = data.services?.offlineStore?.persistence?.store;
      if (storePersistence?.type) {
        offlineStore.persistence = { store: storePersistence };
      }
    }

    const offlineServer = { ...data.services?.offlineStore?.server };
    const offlineEnvFrom = buildEnvFrom(data.offlineStoreSecretName);
    if (offlineEnvFrom) {
      offlineServer.envFrom = offlineEnvFrom;
    }
    if (Object.keys(offlineServer).length > 0) {
      offlineStore.server = offlineServer;
    }

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

  return {
    feastProject: data.feastProject,
    namespace: data.namespace,
    feastProjectDir: data.feastProjectDir,
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
          return `${spaces}- ${lines[0].trim()}\n${lines
            .slice(1)
            .map((l) => `${spaces}  ${l.trim()}`)
            .join('\n')}`;
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
