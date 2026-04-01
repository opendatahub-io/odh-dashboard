import { validateFeatureStoreForm, isFormValid, StepValidation } from '../validationUtils';
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

const makeFormData = (overrides: Partial<FeatureStoreFormData> = {}): FeatureStoreFormData => ({
  ...DEFAULT_FEATURE_STORE_FORM_DATA,
  ...overrides,
});

describe('validateFeatureStoreForm', () => {
  describe('projectBasics', () => {
    it('should fail when name is empty', () => {
      const data = makeFormData({ feastProject: '', namespace: 'ns' });
      const result = validateFeatureStoreForm(data, []);
      expect(result.projectBasics.valid).toBe(false);
      expect(result.projectBasics.message).toBe('Name is required.');
    });

    it('should fail when name is only whitespace', () => {
      const data = makeFormData({ feastProject: '   ', namespace: 'ns' });
      const result = validateFeatureStoreForm(data, []);
      expect(result.projectBasics.valid).toBe(false);
      expect(result.projectBasics.message).toBe('Name is required.');
    });

    it('should fail when name has underscores (invalid RFC 1123)', () => {
      const data = makeFormData({ feastProject: 'my_store', namespace: 'ns' });
      const result = validateFeatureStoreForm(data, []);
      expect(result.projectBasics.valid).toBe(false);
      expect(result.projectBasics.message).toContain('lowercase alphanumeric');
    });

    it('should fail when name has uppercase characters', () => {
      const data = makeFormData({ feastProject: 'MyStore', namespace: 'ns' });
      const result = validateFeatureStoreForm(data, []);
      expect(result.projectBasics.valid).toBe(false);
    });

    it('should fail when name starts with a hyphen', () => {
      const data = makeFormData({ feastProject: '-store', namespace: 'ns' });
      const result = validateFeatureStoreForm(data, []);
      expect(result.projectBasics.valid).toBe(false);
    });

    it('should fail when name ends with a hyphen', () => {
      const data = makeFormData({ feastProject: 'store-', namespace: 'ns' });
      const result = validateFeatureStoreForm(data, []);
      expect(result.projectBasics.valid).toBe(false);
    });

    it('should fail when name starts with a dot', () => {
      const data = makeFormData({ feastProject: '.store', namespace: 'ns' });
      const result = validateFeatureStoreForm(data, []);
      expect(result.projectBasics.valid).toBe(false);
    });

    it('should pass for valid lowercase alphanumeric name', () => {
      const data = makeFormData({ feastProject: 'mystore', namespace: 'ns' });
      const result = validateFeatureStoreForm(data, []);
      expect(result.projectBasics.valid).toBe(true);
    });

    it('should pass for name with hyphens', () => {
      const data = makeFormData({ feastProject: 'my-feature-store', namespace: 'ns' });
      const result = validateFeatureStoreForm(data, []);
      expect(result.projectBasics.valid).toBe(true);
    });

    it('should pass for name with dots', () => {
      const data = makeFormData({ feastProject: 'my.store', namespace: 'ns' });
      const result = validateFeatureStoreForm(data, []);
      expect(result.projectBasics.valid).toBe(true);
    });

    it('should pass for single character name', () => {
      const data = makeFormData({ feastProject: 'a', namespace: 'ns' });
      const result = validateFeatureStoreForm(data, []);
      expect(result.projectBasics.valid).toBe(true);
    });

    it('should fail when name is a duplicate', () => {
      const data = makeFormData({ feastProject: 'mystore', namespace: 'ns' });
      const result = validateFeatureStoreForm(data, ['mystore', 'other']);
      expect(result.projectBasics.valid).toBe(false);
      expect(result.projectBasics.message).toBe('A feature store with this name already exists.');
    });

    it('should pass when name is not a duplicate', () => {
      const data = makeFormData({ feastProject: 'mystore', namespace: 'ns' });
      const result = validateFeatureStoreForm(data, ['other']);
      expect(result.projectBasics.valid).toBe(true);
    });

    it('should fail when namespace is empty', () => {
      const data = makeFormData({ feastProject: 'mystore', namespace: '' });
      const result = validateFeatureStoreForm(data, []);
      expect(result.projectBasics.valid).toBe(false);
      expect(result.projectBasics.message).toBe('Namespace is required.');
    });
  });

  describe('registry', () => {
    it('should pass with default local registry (restAPI and grpc true)', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        registryType: RegistryType.LOCAL,
      });
      const result = validateFeatureStoreForm(data, []);
      expect(result.registry.valid).toBe(true);
    });

    it('should fail when restAPI is disabled even if grpc is enabled', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        registryType: RegistryType.LOCAL,
        services: {
          registry: {
            local: {
              server: { restAPI: false, grpc: true },
            },
          },
        },
      });
      const result = validateFeatureStoreForm(data, []);
      expect(result.registry.valid).toBe(false);
      expect(result.registry.message).toContain('REST API must be enabled');
    });

    it('should fail when both restAPI and grpc are disabled', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        registryType: RegistryType.LOCAL,
        services: {
          registry: {
            local: {
              server: { restAPI: false, grpc: false },
            },
          },
        },
      });
      const result = validateFeatureStoreForm(data, []);
      expect(result.registry.valid).toBe(false);
      expect(result.registry.message).toContain('REST API must be enabled');
    });

    it('should pass when restAPI is enabled', () => {
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
      const result = validateFeatureStoreForm(data, []);
      expect(result.registry.valid).toBe(true);
    });

    it('should fail when local registry DB type is missing', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        registryType: RegistryType.LOCAL,
        registryPersistenceType: PersistenceType.DB,
        services: {
          registry: {
            local: {
              server: { restAPI: true, grpc: true },
              persistence: {
                store: { type: '', secretRef: { name: 'secret' } },
              },
            },
          },
        },
      });
      const result = validateFeatureStoreForm(data, []);
      expect(result.registry.valid).toBe(false);
      expect(result.registry.message).toBe('Registry DB store type is required.');
    });

    it('should fail when local registry DB secret is missing', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        registryType: RegistryType.LOCAL,
        registryPersistenceType: PersistenceType.DB,
        services: {
          registry: {
            local: {
              server: { restAPI: true, grpc: true },
              persistence: {
                store: { type: 'sql', secretRef: { name: '' } },
              },
            },
          },
        },
      });
      const result = validateFeatureStoreForm(data, []);
      expect(result.registry.valid).toBe(false);
      expect(result.registry.message).toBe('Registry DB store secret reference is required.');
    });

    it('should fail when remote hostname is empty', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        registryType: RegistryType.REMOTE,
        remoteRegistryType: RemoteRegistryType.HOSTNAME,
        services: { registry: { remote: { hostname: '' } } },
      });
      const result = validateFeatureStoreForm(data, []);
      expect(result.registry.valid).toBe(false);
      expect(result.registry.message).toBe('Remote registry hostname is required.');
    });

    it('should pass when remote hostname is provided', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        registryType: RegistryType.REMOTE,
        remoteRegistryType: RemoteRegistryType.HOSTNAME,
        services: { registry: { remote: { hostname: 'registry.example.com:443' } } },
      });
      const result = validateFeatureStoreForm(data, []);
      expect(result.registry.valid).toBe(true);
    });

    it('should fail when TLS is enabled but ConfigMap name is empty', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        registryType: RegistryType.REMOTE,
        remoteRegistryType: RemoteRegistryType.HOSTNAME,
        services: {
          registry: {
            remote: {
              hostname: 'registry.example.com:443',
              tls: { configMapRef: { name: '' }, certName: 'service-ca.crt' },
            },
          },
        },
      });
      const result = validateFeatureStoreForm(data, []);
      expect(result.registry.valid).toBe(false);
      expect(result.registry.message).toBe('TLS CA certificate ConfigMap is required.');
    });

    it('should fail when TLS is enabled but cert key name is empty', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        registryType: RegistryType.REMOTE,
        remoteRegistryType: RemoteRegistryType.HOSTNAME,
        services: {
          registry: {
            remote: {
              hostname: 'registry.example.com:443',
              tls: { configMapRef: { name: 'ca-bundle' }, certName: '' },
            },
          },
        },
      });
      const result = validateFeatureStoreForm(data, []);
      expect(result.registry.valid).toBe(false);
      expect(result.registry.message).toBe('TLS certificate key name is required.');
    });

    it('should pass when TLS fields are fully populated', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        registryType: RegistryType.REMOTE,
        remoteRegistryType: RemoteRegistryType.HOSTNAME,
        services: {
          registry: {
            remote: {
              hostname: 'registry.example.com:443',
              tls: { configMapRef: { name: 'ca-bundle' }, certName: 'service-ca.crt' },
            },
          },
        },
      });
      const result = validateFeatureStoreForm(data, []);
      expect(result.registry.valid).toBe(true);
    });

    it('should fail when feastRef name is empty for remote registry', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        registryType: RegistryType.REMOTE,
        remoteRegistryType: RemoteRegistryType.FEAST_REF,
        services: { registry: { remote: { feastRef: { name: '' } } } },
      });
      const result = validateFeatureStoreForm(data, []);
      expect(result.registry.valid).toBe(false);
      expect(result.registry.message).toContain('FeatureStore reference name');
    });

    it('should pass when feastRef is provided', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        registryType: RegistryType.REMOTE,
        remoteRegistryType: RemoteRegistryType.FEAST_REF,
        services: { registry: { remote: { feastRef: { name: 'primary' } } } },
      });
      const result = validateFeatureStoreForm(data, []);
      expect(result.registry.valid).toBe(true);
    });
  });

  describe('storeConfig', () => {
    it('should pass with default config (file-based)', () => {
      const data = makeFormData({ feastProject: 'test', namespace: 'ns' });
      const result = validateFeatureStoreForm(data, []);
      expect(result.storeConfig.valid).toBe(true);
    });

    it('should fail when offline store DB type is missing', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        offlineStoreEnabled: true,
        offlinePersistenceType: PersistenceType.DB,
        services: {
          registry: { local: { server: { restAPI: true, grpc: true } } },
          offlineStore: {
            persistence: {
              store: { type: '', secretRef: { name: 'secret' } },
            },
          },
        },
      });
      const result = validateFeatureStoreForm(data, []);
      expect(result.storeConfig.valid).toBe(false);
      expect(result.storeConfig.message).toBe('Offline store DB type is required.');
    });

    it('should fail when offline store DB secret is missing', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        offlineStoreEnabled: true,
        offlinePersistenceType: PersistenceType.DB,
        services: {
          registry: { local: { server: { restAPI: true, grpc: true } } },
          offlineStore: {
            persistence: {
              store: { type: 'postgres', secretRef: { name: '' } },
            },
          },
        },
      });
      const result = validateFeatureStoreForm(data, []);
      expect(result.storeConfig.valid).toBe(false);
      expect(result.storeConfig.message).toBe('Offline store DB secret reference is required.');
    });

    it('should fail when online store DB type is missing', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        onlinePersistenceType: PersistenceType.DB,
        services: {
          registry: { local: { server: { restAPI: true, grpc: true } } },
          onlineStore: {
            persistence: {
              store: { type: '', secretRef: { name: 'secret' } },
            },
          },
        },
      });
      const result = validateFeatureStoreForm(data, []);
      expect(result.storeConfig.valid).toBe(false);
      expect(result.storeConfig.message).toBe('Online store DB type is required.');
    });

    it('should fail when online store DB secret is missing', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        onlinePersistenceType: PersistenceType.DB,
        services: {
          registry: { local: { server: { restAPI: true, grpc: true } } },
          onlineStore: {
            persistence: {
              store: { type: 'redis', secretRef: { name: '' } },
            },
          },
        },
      });
      const result = validateFeatureStoreForm(data, []);
      expect(result.storeConfig.valid).toBe(false);
      expect(result.storeConfig.message).toBe('Online store DB secret reference is required.');
    });

    it('should pass when store is disabled (regardless of config)', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        offlineStoreEnabled: false,
        offlinePersistenceType: PersistenceType.DB,
      });
      const result = validateFeatureStoreForm(data, []);
      expect(result.storeConfig.valid).toBe(true);
    });
  });

  describe('advanced', () => {
    it('should pass with default config', () => {
      const data = makeFormData({ feastProject: 'test', namespace: 'ns' });
      const result = validateFeatureStoreForm(data, []);
      expect(result.advanced.valid).toBe(true);
    });

    it('should fail when OIDC is selected but secret is empty', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        authzType: AuthzType.OIDC,
        authz: { oidc: { secretRef: { name: '' } } },
      });
      const result = validateFeatureStoreForm(data, []);
      expect(result.advanced.valid).toBe(false);
      expect(result.advanced.message).toBe('OIDC secret reference is required.');
    });

    it('should pass when OIDC is selected with valid secret', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        authzType: AuthzType.OIDC,
        authz: { oidc: { secretRef: { name: 'oidc-secret' } } },
      });
      const result = validateFeatureStoreForm(data, []);
      expect(result.advanced.valid).toBe(true);
    });

    it('should fail when Git is selected but URL is empty', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        projectDirType: ProjectDirType.GIT,
        feastProjectDir: { git: { url: '', ref: '' } },
      });
      const result = validateFeatureStoreForm(data, []);
      expect(result.advanced.valid).toBe(false);
      expect(result.advanced.message).toBe('Git repository URL is required.');
    });

    it('should pass when Git is selected with valid URL', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        projectDirType: ProjectDirType.GIT,
        feastProjectDir: { git: { url: 'https://github.com/example/repo.git', ref: 'main' } },
      });
      const result = validateFeatureStoreForm(data, []);
      expect(result.advanced.valid).toBe(true);
    });

    it('should fail when batch engine is enabled but ConfigMap name is empty', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        batchEngineEnabled: true,
        batchEngineConfigMapName: '',
      });
      const result = validateFeatureStoreForm(data, []);
      expect(result.advanced.valid).toBe(false);
      expect(result.advanced.message).toBe('Batch compute engine ConfigMap is required.');
    });

    it('should pass when batch engine is enabled with a ConfigMap selected', () => {
      const data = makeFormData({
        feastProject: 'test',
        namespace: 'ns',
        batchEngineEnabled: true,
        batchEngineConfigMapName: 'spark-config',
      });
      const result = validateFeatureStoreForm(data, []);
      expect(result.advanced.valid).toBe(true);
    });

    describe('scaling validation', () => {
      it('should fail when HPA max < min replicas', () => {
        const data = makeFormData({
          feastProject: 'test',
          namespace: 'ns',
          scalingEnabled: true,
          scalingMode: ScalingMode.HPA,
          hpaMinReplicas: 5,
          hpaMaxReplicas: 2,
          onlinePersistenceType: PersistenceType.DB,
          registryPersistenceType: PersistenceType.DB,
          registryType: RegistryType.LOCAL,
          services: {
            registry: {
              local: {
                server: { restAPI: true, grpc: true },
                persistence: { store: { type: 'sql', secretRef: { name: 's' } } },
              },
            },
            onlineStore: {
              persistence: { store: { type: 'redis', secretRef: { name: 's' } } },
            },
          },
        });
        const result = validateFeatureStoreForm(data, []);
        expect(result.advanced.valid).toBe(false);
        expect(result.advanced.message).toContain('maximum replicas');
      });

      it('should fail when HPA scaling with file-based online store', () => {
        const data = makeFormData({
          feastProject: 'test',
          namespace: 'ns',
          scalingEnabled: true,
          scalingMode: ScalingMode.HPA,
          hpaMinReplicas: 1,
          hpaMaxReplicas: 3,
          onlinePersistenceType: PersistenceType.FILE,
          registryType: RegistryType.LOCAL,
          registryPersistenceType: PersistenceType.DB,
          services: {
            registry: {
              local: {
                server: { restAPI: true, grpc: true },
                persistence: { store: { type: 'sql', secretRef: { name: 's' } } },
              },
            },
          },
        });
        const result = validateFeatureStoreForm(data, []);
        expect(result.advanced.valid).toBe(false);
        expect(result.advanced.message).toContain('DB-backed persistence for the online store');
      });

      it('should fail when HPA scaling with file-based local registry', () => {
        const data = makeFormData({
          feastProject: 'test',
          namespace: 'ns',
          scalingEnabled: true,
          scalingMode: ScalingMode.HPA,
          hpaMinReplicas: 1,
          hpaMaxReplicas: 3,
          onlinePersistenceType: PersistenceType.DB,
          registryType: RegistryType.LOCAL,
          registryPersistenceType: PersistenceType.FILE,
          services: {
            registry: {
              local: {
                server: { restAPI: true, grpc: true },
              },
            },
            onlineStore: {
              persistence: { store: { type: 'redis', secretRef: { name: 's' } } },
            },
          },
        });
        const result = validateFeatureStoreForm(data, []);
        expect(result.advanced.valid).toBe(false);
        expect(result.advanced.message).toContain('DB-backed or remote registry');
      });

      it('should pass when HPA scaling with S3 registry path', () => {
        const data = makeFormData({
          feastProject: 'test',
          namespace: 'ns',
          scalingEnabled: true,
          scalingMode: ScalingMode.HPA,
          hpaMinReplicas: 1,
          hpaMaxReplicas: 3,
          onlinePersistenceType: PersistenceType.DB,
          registryType: RegistryType.LOCAL,
          registryPersistenceType: PersistenceType.FILE,
          services: {
            registry: {
              local: {
                server: { restAPI: true, grpc: true },
                persistence: { file: { path: 's3://my-bucket/registry.db' } },
              },
            },
            onlineStore: {
              persistence: { store: { type: 'redis', secretRef: { name: 's' } } },
            },
          },
        });
        const result = validateFeatureStoreForm(data, []);
        expect(result.advanced.valid).toBe(true);
      });

      it('should pass when static scaling with 1 replica (no multi-replica constraints)', () => {
        const data = makeFormData({
          feastProject: 'test',
          namespace: 'ns',
          scalingEnabled: true,
          scalingMode: ScalingMode.STATIC,
          replicas: 1,
        });
        const result = validateFeatureStoreForm(data, []);
        expect(result.advanced.valid).toBe(true);
      });

      it('should fail when static scaling > 1 replica with file-based offline store', () => {
        const data = makeFormData({
          feastProject: 'test',
          namespace: 'ns',
          scalingEnabled: true,
          scalingMode: ScalingMode.STATIC,
          replicas: 3,
          offlineStoreEnabled: true,
          offlinePersistenceType: PersistenceType.FILE,
          onlinePersistenceType: PersistenceType.DB,
          registryType: RegistryType.LOCAL,
          registryPersistenceType: PersistenceType.DB,
          services: {
            registry: {
              local: {
                server: { restAPI: true, grpc: true },
                persistence: { store: { type: 'sql', secretRef: { name: 's' } } },
              },
            },
            onlineStore: {
              persistence: { store: { type: 'redis', secretRef: { name: 's' } } },
            },
          },
        });
        const result = validateFeatureStoreForm(data, []);
        expect(result.advanced.valid).toBe(false);
        expect(result.advanced.message).toContain('DB-backed persistence for the offline store');
      });
    });
  });
});

describe('isFormValid', () => {
  it('should return true when all steps are valid', () => {
    const validation: StepValidation = {
      projectBasics: { valid: true },
      registry: { valid: true },
      storeConfig: { valid: true },
      advanced: { valid: true },
    };
    expect(isFormValid(validation)).toBe(true);
  });

  it('should return false when any step is invalid', () => {
    const validation: StepValidation = {
      projectBasics: { valid: true },
      registry: { valid: false, message: 'error' },
      storeConfig: { valid: true },
      advanced: { valid: true },
    };
    expect(isFormValid(validation)).toBe(false);
  });

  it('should return false when multiple steps are invalid', () => {
    const validation: StepValidation = {
      projectBasics: { valid: false, message: 'err1' },
      registry: { valid: false, message: 'err2' },
      storeConfig: { valid: true },
      advanced: { valid: true },
    };
    expect(isFormValid(validation)).toBe(false);
  });
});
