import { buildFormSpec, formSpecToYaml } from '../utils';
import {
  FeatureStoreFormData,
  RegistryType,
  PersistenceType,
  AuthzType,
  ProjectDirType,
  RemoteRegistryType,
  ScalingMode,
} from '../types';
import { DEFAULT_FEATURE_STORE_FORM_DATA } from '../useCreateFeatureStoreProjectState';
import { FEATURE_STORE_UI_LABEL_KEY, FEATURE_STORE_UI_LABEL_VALUE } from '../../../const';

const makeFormData = (overrides: Partial<FeatureStoreFormData> = {}): FeatureStoreFormData => ({
  ...DEFAULT_FEATURE_STORE_FORM_DATA,
  ...overrides,
});

describe('buildFormSpec', () => {
  describe('basic fields', () => {
    it('should set feastProject and namespace from form data', () => {
      const data = makeFormData({ feastProject: 'mystore', namespace: 'test-ns' });
      const spec = buildFormSpec(data, false);
      expect(spec.feastProject).toBe('mystore');
      expect(spec.namespace).toBe('test-ns');
    });

    it('should include UI label when addUILabel is true', () => {
      const data = makeFormData({ feastProject: 'test', namespace: 'ns' });
      const spec = buildFormSpec(data, true);
      expect(spec.labels).toEqual({
        [FEATURE_STORE_UI_LABEL_KEY]: FEATURE_STORE_UI_LABEL_VALUE,
      });
    });

    it('should not include labels when addUILabel is false', () => {
      const data = makeFormData({ feastProject: 'test', namespace: 'ns' });
      const spec = buildFormSpec(data, false);
      expect(spec.labels).toBeUndefined();
    });
  });

  describe('registry services', () => {
    it('should preserve restAPI and grpc for local registry with defaults', () => {
      const data = makeFormData({ feastProject: 'test', namespace: 'ns' });
      const spec = buildFormSpec(data, false);
      const registryServer = spec.services?.registry?.local?.server;
      expect(registryServer?.restAPI).toBe(true);
      expect(registryServer?.grpc).toBe(true);
    });

    it('should preserve restAPI true and grpc false', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        registryType: RegistryType.LOCAL,
        services: {
          registry: {
            local: {
              server: { restAPI: true, grpc: false },
            },
          },
        },
      });
      const spec = buildFormSpec(data, false);
      const registryServer = spec.services?.registry?.local?.server;
      expect(registryServer?.restAPI).toBe(true);
      expect(registryServer?.grpc).toBe(false);
    });

    it('should include envFrom for registry secret', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        registrySecretName: 's3-secret',
      });
      const spec = buildFormSpec(data, false);
      const envFrom = spec.services?.registry?.local?.server?.envFrom;
      expect(envFrom).toEqual([{ secretRef: { name: 's3-secret' } }]);
    });

    it('should not include envFrom when registry secret is empty', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        registrySecretName: '',
      });
      const spec = buildFormSpec(data, false);
      const envFrom = spec.services?.registry?.local?.server?.envFrom;
      expect(envFrom).toBeUndefined();
    });

    it('should include file persistence for local registry when path provided', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        registryType: RegistryType.LOCAL,
        registryPersistenceType: PersistenceType.FILE,
        services: {
          registry: {
            local: {
              server: { restAPI: true, grpc: true },
              persistence: { file: { path: 's3://bucket/registry.db' } },
            },
          },
        },
      });
      const spec = buildFormSpec(data, false);
      expect(spec.services?.registry?.local?.persistence?.file?.path).toBe(
        's3://bucket/registry.db',
      );
    });

    it('should include DB persistence for local registry when type provided', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        registryType: RegistryType.LOCAL,
        registryPersistenceType: PersistenceType.DB,
        services: {
          registry: {
            local: {
              server: { restAPI: true, grpc: true },
              persistence: { store: { type: 'sql', secretRef: { name: 'db-secret' } } },
            },
          },
        },
      });
      const spec = buildFormSpec(data, false);
      expect(spec.services?.registry?.local?.persistence?.store?.type).toBe('sql');
    });

    it('should build remote registry with feastRef', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        registryType: RegistryType.REMOTE,
        remoteRegistryType: RemoteRegistryType.FEAST_REF,
        services: {
          registry: {
            remote: { feastRef: { name: 'primary', namespace: 'feast-ns' } },
          },
        },
      });
      const spec = buildFormSpec(data, false);
      expect(spec.services?.registry?.remote?.feastRef).toEqual({
        name: 'primary',
        namespace: 'feast-ns',
      });
    });

    it('should build remote registry with hostname', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        registryType: RegistryType.REMOTE,
        remoteRegistryType: RemoteRegistryType.HOSTNAME,
        services: {
          registry: {
            remote: { hostname: 'registry.example.com:443' },
          },
        },
      });
      const spec = buildFormSpec(data, false);
      expect(spec.services?.registry?.remote?.hostname).toBe('registry.example.com:443');
    });
  });

  describe('online store', () => {
    it('should include online store when enabled', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        onlineStoreEnabled: true,
      });
      const spec = buildFormSpec(data, false);
      expect(spec.services?.onlineStore).toBeDefined();
    });

    it('should not include online store when disabled', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        onlineStoreEnabled: false,
      });
      const spec = buildFormSpec(data, false);
      expect(spec.services?.onlineStore).toBeUndefined();
    });

    it('should include online store envFrom when secret is provided', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        onlineStoreEnabled: true,
        onlineStoreSecretName: 'redis-secret',
      });
      const spec = buildFormSpec(data, false);
      expect(spec.services?.onlineStore?.server?.envFrom).toEqual([
        { secretRef: { name: 'redis-secret' } },
      ]);
    });

    it('should include online store DB persistence', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        onlineStoreEnabled: true,
        onlinePersistenceType: PersistenceType.DB,
        services: {
          registry: { local: { server: { restAPI: true, grpc: true } } },
          onlineStore: {
            persistence: { store: { type: 'redis', secretRef: { name: 's' } } },
          },
        },
      });
      const spec = buildFormSpec(data, false);
      expect(spec.services?.onlineStore?.persistence?.store?.type).toBe('redis');
    });
  });

  describe('offline store', () => {
    it('should include offline store when enabled', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        offlineStoreEnabled: true,
      });
      const spec = buildFormSpec(data, false);
      expect(spec.services?.offlineStore).toBeDefined();
    });

    it('should not include offline store when disabled', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        offlineStoreEnabled: false,
      });
      const spec = buildFormSpec(data, false);
      expect(spec.services?.offlineStore).toBeUndefined();
    });
  });

  describe('scaling', () => {
    it('should include HPA scaling config', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        scalingEnabled: true,
        scalingMode: ScalingMode.HPA,
        hpaMinReplicas: 2,
        hpaMaxReplicas: 5,
      });
      const spec = buildFormSpec(data, false);
      expect(spec.services?.scaling?.autoscaling).toEqual({
        minReplicas: 2,
        maxReplicas: 5,
      });
      expect(spec.replicas).toBeUndefined();
    });

    it('should include static replicas when scaling is static', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        scalingEnabled: true,
        scalingMode: ScalingMode.STATIC,
        replicas: 3,
      });
      const spec = buildFormSpec(data, false);
      expect(spec.replicas).toBe(3);
      expect(spec.services?.scaling).toBeUndefined();
    });

    it('should not include replicas when scaling is disabled', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        scalingEnabled: false,
        replicas: 5,
      });
      const spec = buildFormSpec(data, false);
      expect(spec.replicas).toBeUndefined();
    });
  });

  describe('advanced options', () => {
    it('should include authorization config', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        authzType: AuthzType.OIDC,
        authz: { oidc: { secretRef: { name: 'oidc-secret' } } },
      });
      const spec = buildFormSpec(data, false);
      expect(spec.authz).toEqual({ oidc: { secretRef: { name: 'oidc-secret' } } });
    });

    it('should not include authz when AuthzType is NONE', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        authzType: AuthzType.NONE,
      });
      const spec = buildFormSpec(data, false);
      expect(spec.authz).toBeUndefined();
    });

    it('should include cronJob when provided', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        cronJob: { schedule: '*/5 * * * *' },
      });
      const spec = buildFormSpec(data, false);
      expect(spec.cronJob).toEqual({ schedule: '*/5 * * * *' });
    });

    it('should include batch engine when enabled with configMap', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        batchEngineEnabled: true,
        batchEngineConfigMapName: 'spark-config',
        batchEngineConfigMapKey: 'config.yaml',
      });
      const spec = buildFormSpec(data, false);
      expect(spec.batchEngine).toEqual({
        configMapRef: { name: 'spark-config' },
        configMapKey: 'config.yaml',
      });
    });

    it('should not include batch engine when disabled', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        batchEngineEnabled: false,
        batchEngineConfigMapName: 'spark-config',
      });
      const spec = buildFormSpec(data, false);
      expect(spec.batchEngine).toBeUndefined();
    });

    it('should include disableInitContainers when true', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        services: {
          registry: { local: { server: { restAPI: true, grpc: true } } },
          disableInitContainers: true,
        },
      });
      const spec = buildFormSpec(data, false);
      expect(spec.services?.disableInitContainers).toBe(true);
    });

    it('should include runFeastApplyOnInit as false when set', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        services: {
          registry: { local: { server: { restAPI: true, grpc: true } } },
          runFeastApplyOnInit: false,
        },
      });
      const spec = buildFormSpec(data, false);
      expect(spec.services?.runFeastApplyOnInit).toBe(false);
    });
  });

  describe('feastProjectDir', () => {
    it('should not set feastProjectDir for NONE type', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        projectDirType: ProjectDirType.NONE,
      });
      const spec = buildFormSpec(data, false);
      expect(spec.feastProjectDir).toBeUndefined();
    });

    it('should include git config with envFrom when git secret is provided', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        projectDirType: ProjectDirType.GIT,
        feastProjectDir: {
          git: { url: 'https://github.com/example/repo.git', ref: 'main' },
        },
        gitSecretName: 'git-creds',
      });
      const spec = buildFormSpec(data, false);
      expect(spec.feastProjectDir?.git?.envFrom).toEqual([{ secretRef: { name: 'git-creds' } }]);
    });

    it('should not include git envFrom when git secret is empty', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        projectDirType: ProjectDirType.GIT,
        feastProjectDir: {
          git: { url: 'https://github.com/example/repo.git', ref: 'main' },
        },
        gitSecretName: '',
      });
      const spec = buildFormSpec(data, false);
      expect(spec.feastProjectDir?.git?.envFrom).toBeUndefined();
    });
  });

  describe('server config cleaning', () => {
    it('should strip empty resource values from server config', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        onlineStoreEnabled: true,
        services: {
          registry: { local: { server: { restAPI: true, grpc: true } } },
          onlineStore: {
            server: {
              resources: {
                requests: { cpu: '', memory: '256Mi' },
                limits: { cpu: '', memory: '' },
              },
            },
          },
        },
      });
      const spec = buildFormSpec(data, false);
      const resources = spec.services?.onlineStore?.server?.resources;
      expect(resources?.requests).toEqual({ memory: '256Mi' });
      expect(resources?.limits).toBeUndefined();
    });

    it('should include logLevel when set', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        onlineStoreEnabled: true,
        services: {
          registry: { local: { server: { restAPI: true, grpc: true } } },
          onlineStore: {
            server: { logLevel: 'debug' },
          },
        },
      });
      const spec = buildFormSpec(data, false);
      expect(spec.services?.onlineStore?.server?.logLevel).toBe('debug');
    });

    it('should include worker configs when set', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        onlineStoreEnabled: true,
        services: {
          registry: { local: { server: { restAPI: true, grpc: true } } },
          onlineStore: {
            server: {
              workerConfigs: { workers: 4, workerConnections: 100 },
            },
          },
        },
      });
      const spec = buildFormSpec(data, false);
      const wc = spec.services?.onlineStore?.server?.workerConfigs;
      expect(wc?.workers).toBe(4);
      expect(wc?.workerConnections).toBe(100);
    });
  });
});

describe('formSpecToYaml', () => {
  it('should produce valid YAML structure with apiVersion, kind, metadata, spec', () => {
    const data = makeFormData({ feastProject: 'test', namespace: 'test-ns' });
    const spec = buildFormSpec(data, false);
    const yaml = formSpecToYaml(spec);

    expect(yaml).toContain('apiVersion: feast.dev/v1');
    expect(yaml).toContain('kind: FeatureStore');
    expect(yaml).toContain('name: test');
    expect(yaml).toContain('namespace: test-ns');
    expect(yaml).toContain('feastProject: test');
  });

  it('should include labels in metadata when present', () => {
    const data = makeFormData({ feastProject: 'test', namespace: 'ns' });
    const spec = buildFormSpec(data, true);
    const yaml = formSpecToYaml(spec);

    expect(yaml).toContain('labels:');
    expect(yaml).toContain(`${FEATURE_STORE_UI_LABEL_KEY}: ${FEATURE_STORE_UI_LABEL_VALUE}`);
  });

  it('should not include labels in metadata when absent', () => {
    const data = makeFormData({ feastProject: 'test', namespace: 'ns' });
    const spec = buildFormSpec(data, false);
    const yaml = formSpecToYaml(spec);

    expect(yaml).not.toContain('labels:');
  });

  it('should handle nested services in YAML output', () => {
    const data = makeFormData({
      feastProject: 'test',
      namespace: 'ns',
      onlineStoreEnabled: true,
      onlinePersistenceType: PersistenceType.DB,
      services: {
        registry: { local: { server: { restAPI: true, grpc: true } } },
        onlineStore: {
          persistence: { store: { type: 'redis', secretRef: { name: 'redis-secret' } } },
        },
      },
    });
    const spec = buildFormSpec(data, false);
    const yaml = formSpecToYaml(spec);

    expect(yaml).toContain('services:');
    expect(yaml).toContain('onlineStore:');
    expect(yaml).toContain('type: redis');
  });
});
