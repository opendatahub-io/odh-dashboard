import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { FeatureStoreModel } from '@odh-dashboard/internal/api/models/odh';
import { PodModel } from '@odh-dashboard/internal/api/models/k8s';
import { FeatureStoreKind } from '../../k8sTypes';
import {
  createFeatureStore,
  listFeatureStores,
  listAllFeatureStores,
  getFeatureStore,
  deleteFeatureStore,
  getPodsForFeatureStore,
  FeatureStoreFormSpec,
} from '../featureStores';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sCreateResource: jest.fn(),
  k8sDeleteResource: jest.fn(),
  k8sGetResource: jest.fn(),
  k8sListResource: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/api/apiMergeUtils', () => ({
  applyK8sAPIOptions: jest.fn((opts: object) => opts),
}));

jest.mock('@odh-dashboard/k8s-core', () => ({
  kindApiVersion: jest.fn(() => 'feast.dev/v1'),
  isValidK8sName: jest.requireActual('@odh-dashboard/k8s-core').isValidK8sName,
}));

const k8sCreateResourceMock = jest.mocked(k8sCreateResource);
const k8sDeleteResourceMock = jest.mocked(k8sDeleteResource);
const k8sGetResourceMock = jest.mocked(k8sGetResource);
const k8sListResourceMock = jest.mocked(k8sListResource);

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

describe('listFeatureStores', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call k8sListResource with correct model and namespace', async () => {
    const mockStore = makeFeatureStore();
    k8sListResourceMock.mockResolvedValue({ items: [mockStore] } as never);

    const result = await listFeatureStores('test-ns');

    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: FeatureStoreModel,
      queryOptions: { ns: 'test-ns' },
    });
    expect(result).toHaveLength(1);
    expect(result[0].metadata.name).toBe('test-store');
  });

  it('should apply validation and normalization to results', async () => {
    const valid = makeFeatureStore({ name: 'valid' });
    const invalid = makeFeatureStore({ name: '' });
    k8sListResourceMock.mockResolvedValue({ items: [invalid, valid] } as never);

    const result = await listFeatureStores('test-ns');

    expect(result).toHaveLength(1);
    expect(result[0].metadata.labels).toEqual({});
  });
});

describe('listAllFeatureStores', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call k8sListResource with empty queryOptions', async () => {
    const stores = [
      makeFeatureStore({ name: 'store-1', namespace: 'ns-1' }),
      makeFeatureStore({ name: 'store-2', namespace: 'ns-2' }),
    ];
    k8sListResourceMock.mockResolvedValue({ items: stores } as never);

    const result = await listAllFeatureStores();

    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: FeatureStoreModel,
      queryOptions: {},
    });
    expect(result).toHaveLength(2);
  });
});

describe('getFeatureStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call k8sGetResource and normalize the result', async () => {
    const store = makeFeatureStore({ status: { phase: 'Ready' } } as Partial<FeatureStoreKind>);
    k8sGetResourceMock.mockResolvedValue(store as never);

    const result = await getFeatureStore('test-ns', 'test-store');

    expect(k8sGetResourceMock).toHaveBeenCalledWith({
      model: FeatureStoreModel,
      queryOptions: { name: 'test-store', ns: 'test-ns' },
    });
    expect(result.metadata.labels).toEqual({});
  });
});

describe('createFeatureStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should assemble resource and call k8sCreateResource', async () => {
    const mockCreated = makeFeatureStore();
    k8sCreateResourceMock.mockResolvedValue(mockCreated as never);

    const formData: FeatureStoreFormSpec = {
      feastProject: 'test-project',
      namespace: 'test-ns',
    };
    const result = await createFeatureStore(formData);

    expect(k8sCreateResourceMock).toHaveBeenCalledTimes(1);
    const callArg = k8sCreateResourceMock.mock.calls[0][0] as unknown as {
      resource: FeatureStoreKind;
    };
    expect(callArg.resource.spec.feastProject).toBe('test-project');
    expect(result.metadata.labels).toEqual({});
  });
});

describe('deleteFeatureStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call k8sDeleteResource and return K8sStatus', async () => {
    const mockStatus = {
      kind: 'Status',
      apiVersion: 'v1',
      status: 'Success',
      code: 200,
    };
    k8sDeleteResourceMock.mockResolvedValue(mockStatus as never);

    const result = await deleteFeatureStore('test-ns', 'test-store');

    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      model: FeatureStoreModel,
      queryOptions: { name: 'test-store', ns: 'test-ns' },
    });
    expect(result).toEqual(mockStatus);
  });
});

describe('getPodsForFeatureStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call k8sListResource with correct label selector', async () => {
    const mockPods = [{ metadata: { name: 'pod-1' } }];
    k8sListResourceMock.mockResolvedValue({ items: mockPods } as never);

    const result = await getPodsForFeatureStore('test-ns', 'my-store');

    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: PodModel,
      queryOptions: {
        ns: 'test-ns',
        queryParams: { labelSelector: 'feast.dev/name=my-store' },
      },
    });
    expect(result).toEqual(mockPods);
  });

  it('should reject invalid featureStoreName', async () => {
    await expect(getPodsForFeatureStore('test-ns', 'store,app=nginx')).rejects.toThrow(
      /Invalid featureStoreName/,
    );
    expect(k8sListResourceMock).not.toHaveBeenCalled();
  });

  it('should reject empty featureStoreName', async () => {
    await expect(getPodsForFeatureStore('test-ns', '')).rejects.toThrow(/Invalid featureStoreName/);
    expect(k8sListResourceMock).not.toHaveBeenCalled();
  });
});
