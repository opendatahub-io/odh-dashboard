import { FeatureStoreModel } from '@odh-dashboard/internal/api/models/odh';
import { FeatureStoreKind } from '../../k8sTypes';
import {
  assembleFeatureStore,
  isValidFeatureStore,
  normalizeFeatureStore,
  normalizeFeatureStoreList,
  FeatureStoreFormSpec,
} from '../featureStoreUtils';

jest.mock('@odh-dashboard/k8s-core', () => ({
  kindApiVersion: jest.fn(() => 'feast.dev/v1'),
  isValidK8sName: jest.requireActual('@odh-dashboard/k8s-core').isValidK8sName,
}));

const makeFeatureStore = (
  overrides: Partial<FeatureStoreKind> & {
    name?: string;
    namespace?: string;
    feastProject?: string;
  } = {},
): FeatureStoreKind => ({
  apiVersion: 'feast.dev/v1',
  kind: 'FeatureStore',
  metadata: {
    name: overrides.name ?? 'test-store',
    namespace: overrides.namespace ?? 'test-ns',
    ...overrides.metadata,
  },
  spec: {
    feastProject: overrides.feastProject ?? 'test-project',
    ...overrides.spec,
  },
  ...('status' in overrides ? { status: overrides.status } : {}),
});

describe('assembleFeatureStore', () => {
  const minimalFormData: FeatureStoreFormSpec = {
    feastProject: 'my-project',
    namespace: 'my-namespace',
  };

  it('should assemble a minimal FeatureStore with only required fields', () => {
    const result = assembleFeatureStore(minimalFormData);

    expect(result).toEqual({
      apiVersion: 'feast.dev/v1',
      kind: FeatureStoreModel.kind,
      metadata: {
        name: 'my-project',
        namespace: 'my-namespace',
      },
      spec: {
        feastProject: 'my-project',
      },
    });
  });

  it('should include services when provided', () => {
    const formData: FeatureStoreFormSpec = {
      ...minimalFormData,
      services: { onlineStore: { persistence: { file: { path: '/data' } } } },
    };
    const result = assembleFeatureStore(formData);

    expect(result.spec.services).toEqual({
      onlineStore: { persistence: { file: { path: '/data' } } },
    });
  });

  it('should include authz when provided', () => {
    const formData: FeatureStoreFormSpec = {
      ...minimalFormData,
      authz: { kubernetes: { roles: ['admin'] } },
    };
    const result = assembleFeatureStore(formData);

    expect(result.spec.authz).toEqual({ kubernetes: { roles: ['admin'] } });
  });

  it('should include feastProjectDir when provided', () => {
    const formData: FeatureStoreFormSpec = {
      ...minimalFormData,
      feastProjectDir: {
        git: { url: 'https://github.com/example/repo.git' },
      },
    };
    const result = assembleFeatureStore(formData);

    expect(result.spec.feastProjectDir).toEqual({
      git: { url: 'https://github.com/example/repo.git' },
    });
  });

  it('should include cronJob when provided', () => {
    const formData: FeatureStoreFormSpec = {
      ...minimalFormData,
      cronJob: { schedule: '*/5 * * * *' },
    };
    const result = assembleFeatureStore(formData);

    expect(result.spec.cronJob).toEqual({ schedule: '*/5 * * * *' });
  });

  it('should include batchEngine when provided', () => {
    const formData: FeatureStoreFormSpec = {
      ...minimalFormData,
      batchEngine: { configMapRef: { name: 'spark-config' } },
    };
    const result = assembleFeatureStore(formData);

    expect(result.spec.batchEngine).toEqual({ configMapRef: { name: 'spark-config' } });
  });

  it('should include replicas only when greater than 1', () => {
    expect(assembleFeatureStore({ ...minimalFormData, replicas: 3 }).spec.replicas).toBe(3);
    expect(assembleFeatureStore({ ...minimalFormData, replicas: 1 }).spec.replicas).toBeUndefined();
    expect(assembleFeatureStore({ ...minimalFormData, replicas: 0 }).spec.replicas).toBeUndefined();
  });

  it('should include labels when non-empty', () => {
    const formData: FeatureStoreFormSpec = {
      ...minimalFormData,
      labels: { 'feature-store-ui': 'enabled' },
    };
    const result = assembleFeatureStore(formData);

    expect(result.metadata.labels).toEqual({ 'feature-store-ui': 'enabled' });
  });

  it('should omit labels when empty object', () => {
    const formData: FeatureStoreFormSpec = {
      ...minimalFormData,
      labels: {},
    };
    const result = assembleFeatureStore(formData);

    expect(result.metadata.labels).toBeUndefined();
  });

  it('should throw on invalid namespace', () => {
    expect(() => assembleFeatureStore({ ...minimalFormData, namespace: '' })).toThrow(
      /Invalid namespace/,
    );
    expect(() => assembleFeatureStore({ ...minimalFormData, namespace: 'Bad-NS' })).toThrow(
      /Invalid namespace/,
    );
  });

  it('should throw on uppercase characters in feastProject', () => {
    expect(() => assembleFeatureStore({ ...minimalFormData, feastProject: 'MyProject' })).toThrow(
      /Invalid feastProject name/,
    );
  });

  it('should throw on feastProject starting with a hyphen', () => {
    expect(() => assembleFeatureStore({ ...minimalFormData, feastProject: '-bad-name' })).toThrow(
      /Invalid feastProject name/,
    );
  });

  it('should throw on feastProject ending with a hyphen', () => {
    expect(() => assembleFeatureStore({ ...minimalFormData, feastProject: 'bad-name-' })).toThrow(
      /Invalid feastProject name/,
    );
  });

  it('should throw on feastProject with spaces', () => {
    expect(() => assembleFeatureStore({ ...minimalFormData, feastProject: 'bad name' })).toThrow(
      /Invalid feastProject name/,
    );
  });

  it('should throw on empty feastProject', () => {
    expect(() => assembleFeatureStore({ ...minimalFormData, feastProject: '' })).toThrow(
      /Invalid feastProject name/,
    );
  });

  it('should accept valid DNS-1123 names', () => {
    expect(() =>
      assembleFeatureStore({ ...minimalFormData, feastProject: 'my-project-01' }),
    ).not.toThrow();
    expect(() => assembleFeatureStore({ ...minimalFormData, feastProject: 'a' })).not.toThrow();
    expect(() =>
      assembleFeatureStore({ ...minimalFormData, feastProject: 'test-123-store' }),
    ).not.toThrow();
  });

  it('should not include optional spec fields when not provided', () => {
    const result = assembleFeatureStore(minimalFormData);

    expect(result.spec.services).toBeUndefined();
    expect(result.spec.authz).toBeUndefined();
    expect(result.spec.feastProjectDir).toBeUndefined();
    expect(result.spec.cronJob).toBeUndefined();
    expect(result.spec.batchEngine).toBeUndefined();
    expect(result.spec.replicas).toBeUndefined();
  });
});

describe('isValidFeatureStore', () => {
  it('returns true for a valid store', () => {
    expect(isValidFeatureStore(makeFeatureStore())).toBe(true);
  });

  it('returns false when name is empty', () => {
    expect(isValidFeatureStore(makeFeatureStore({ name: '' }))).toBe(false);
  });

  it('returns false when namespace is empty', () => {
    expect(isValidFeatureStore(makeFeatureStore({ namespace: '' }))).toBe(false);
  });

  it('returns false when feastProject is empty', () => {
    expect(isValidFeatureStore(makeFeatureStore({ feastProject: '' }))).toBe(false);
  });
});

describe('normalizeFeatureStore', () => {
  it('defaults labels and annotations to empty objects', () => {
    const result = normalizeFeatureStore(makeFeatureStore());
    expect(result.metadata.labels).toEqual({});
    expect(result.metadata.annotations).toEqual({});
  });

  it('defaults status fields when status exists', () => {
    const store = makeFeatureStore({ status: { phase: 'Ready' } } as Partial<FeatureStoreKind>);
    const result = normalizeFeatureStore(store);
    expect(result.status?.conditions).toEqual([]);
    expect(result.status?.phase).toBe('Ready');
    expect(result.status?.serviceHostnames).toEqual({});
  });

  it('defaults phase to Pending when missing', () => {
    const store = makeFeatureStore({ status: {} } as Partial<FeatureStoreKind>);
    const result = normalizeFeatureStore(store);
    expect(result.status?.phase).toBe('Pending');
  });

  it('leaves status undefined when not present', () => {
    const result = normalizeFeatureStore(makeFeatureStore());
    expect(result.status).toBeUndefined();
  });
});

describe('normalizeFeatureStoreList', () => {
  it('filters invalid and normalizes valid stores', () => {
    const valid = makeFeatureStore({ name: 'valid' });
    const invalid = makeFeatureStore({ name: '' });
    const result = normalizeFeatureStoreList([valid, invalid]);

    expect(result).toHaveLength(1);
    expect(result[0].metadata.name).toBe('valid');
    expect(result[0].metadata.labels).toEqual({});
  });
});
