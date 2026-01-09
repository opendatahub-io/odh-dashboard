import { standardUseFetchStateObject, testHook } from '@odh-dashboard/jest-config/hooks';
import { getWorkbenchFeatureStores } from '#~/api/featureStore/custom';
import {
  useWorkbenchFeatureStores,
  WorkbenchFeatureStoreConfig,
} from '#~/pages/projects/screens/spawner/featureStore/useWorkbenchFeatureStores';

jest.mock('#~/api/featureStore/custom', () => ({
  getWorkbenchFeatureStores: jest.fn(),
}));

jest.mock('#~/utilities/useFetch', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockGetWorkbenchFeatureStores = jest.mocked(getWorkbenchFeatureStores);
const mockUseFetch = jest.mocked(require('#~/utilities/useFetch').default);

describe('useWorkbenchFeatureStores', () => {
  const mockWorkbenchResponse = {
    namespaces: [
      {
        namespace: 'credit-namespace',
        clientConfigs: [
          {
            configName: 'feast-sample-git-client',
            projectName: 'credit_scoring_local',
            hasAccessToFeatureStore: true,
          },
        ],
      },
      {
        namespace: 'test-feast-banking',
        clientConfigs: [
          {
            configName: 'feast-banking-client',
            projectName: 'banking',
            hasAccessToFeatureStore: true,
          },
          {
            configName: 'feast-fraud-detect-client',
            projectName: 'fraud_detect',
            hasAccessToFeatureStore: false,
          },
        ],
      },
    ],
  };

  const expectedFeatureStores: WorkbenchFeatureStoreConfig[] = [
    {
      namespace: 'credit-namespace',
      configName: 'feast-sample-git-client',
      projectName: 'credit_scoring_local',
      configMap: null,
      hasAccessToFeatureStore: true,
    },
    {
      namespace: 'test-feast-banking',
      configName: 'feast-banking-client',
      projectName: 'banking',
      configMap: null,
      hasAccessToFeatureStore: true,
    },
    {
      namespace: 'test-feast-banking',
      configName: 'feast-fraud-detect-client',
      projectName: 'fraud_detect',
      configMap: null,
      hasAccessToFeatureStore: false,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWorkbenchFeatureStores.mockResolvedValue(mockWorkbenchResponse);
    mockUseFetch.mockReturnValue(standardUseFetchStateObject({ data: [] }));
  });

  it('should call getWorkbenchFeatureStores API when callback executes', () => {
    testHook(useWorkbenchFeatureStores)();
    expect(mockUseFetch).toHaveBeenCalled();
    const callbackArg = mockUseFetch.mock.calls[0]?.[0];
    expect(callbackArg).toBeDefined();
    expect(typeof callbackArg).toBe('function');

    callbackArg();
    expect(mockGetWorkbenchFeatureStores).toHaveBeenCalled();
  });

  it('should return empty array initially', () => {
    const renderResult = testHook(useWorkbenchFeatureStores)();
    const { featureStores, loaded, error } = renderResult.result.current;

    expect(featureStores).toStrictEqual([]);
    expect(loaded).toBe(false);
    expect(error).toBeUndefined();
  });

  it('should transform backend response to WorkbenchFeatureStoreConfig array', async () => {
    mockUseFetch.mockReturnValue(
      standardUseFetchStateObject({
        data: expectedFeatureStores,
        loaded: true,
      }),
    );

    const renderResult = testHook(useWorkbenchFeatureStores)();
    const { featureStores, loaded, error } = renderResult.result.current;

    expect(featureStores).toStrictEqual(expectedFeatureStores);
    expect(loaded).toBe(true);
    expect(error).toBeUndefined();
  });

  it('should handle empty namespaces array', async () => {
    mockGetWorkbenchFeatureStores.mockResolvedValue({ namespaces: [] });
    mockUseFetch.mockReturnValue(
      standardUseFetchStateObject({
        data: [],
        loaded: true,
      }),
    );

    const renderResult = testHook(useWorkbenchFeatureStores)();
    const { featureStores, loaded } = renderResult.result.current;

    expect(featureStores).toHaveLength(0);
    expect(loaded).toBe(true);
  });

  it('should handle error state', async () => {
    const error = new Error('Failed to fetch feature stores');
    mockUseFetch.mockReturnValue(
      standardUseFetchStateObject({
        data: [],
        loaded: false,
        error,
      }),
    );

    const renderResult = testHook(useWorkbenchFeatureStores)();
    const { error: hookError, loaded, featureStores } = renderResult.result.current;

    expect(hookError).toBe(error);
    expect(loaded).toBe(false);
    expect(featureStores).toHaveLength(0);
  });

  it('should provide refresh function', () => {
    const renderResult = testHook(useWorkbenchFeatureStores)();
    const { refresh } = renderResult.result.current;

    expect(typeof refresh).toBe('function');
  });

  it('should preserve hasAccessToFeatureStore from backend response', async () => {
    mockUseFetch.mockReturnValue(
      standardUseFetchStateObject({
        data: expectedFeatureStores,
        loaded: true,
      }),
    );

    const renderResult = testHook(useWorkbenchFeatureStores)();
    const { featureStores } = renderResult.result.current;

    const creditScoring = featureStores.find(
      (fs: WorkbenchFeatureStoreConfig) => fs.projectName === 'credit_scoring_local',
    );
    const fraudDetect = featureStores.find(
      (fs: WorkbenchFeatureStoreConfig) => fs.projectName === 'fraud_detect',
    );

    expect(creditScoring?.hasAccessToFeatureStore).toBe(true);
    expect(fraudDetect?.hasAccessToFeatureStore).toBe(false);
  });

  it('should throw error when namespaces is not an array', async () => {
    mockGetWorkbenchFeatureStores.mockResolvedValue({ namespaces: null as unknown as [] });

    testHook(useWorkbenchFeatureStores)();
    const callbackArg = mockUseFetch.mock.calls[0]?.[0];

    await expect(callbackArg()).rejects.toThrow('Failed to load feature stores');
  });

  it('should throw error when namespaces is undefined', async () => {
    mockGetWorkbenchFeatureStores.mockResolvedValue({ namespaces: undefined as unknown as [] });

    testHook(useWorkbenchFeatureStores)();
    const callbackArg = mockUseFetch.mock.calls[0]?.[0];

    await expect(callbackArg()).rejects.toThrow('Failed to load feature stores');
  });

  it('should handle namespace with missing clientConfigs array', async () => {
    mockGetWorkbenchFeatureStores.mockResolvedValue({
      namespaces: [
        {
          namespace: 'test-namespace',
          clientConfigs: null as unknown as [],
        },
      ],
    });
    mockUseFetch.mockReturnValue(
      standardUseFetchStateObject({
        data: [],
        loaded: true,
      }),
    );

    testHook(useWorkbenchFeatureStores)();
    const callbackArg = mockUseFetch.mock.calls[0]?.[0];
    const result = await callbackArg();

    expect(result).toStrictEqual([]);
  });

  it('should handle namespace with undefined clientConfigs', async () => {
    mockGetWorkbenchFeatureStores.mockResolvedValue({
      namespaces: [
        {
          namespace: 'test-namespace',
          clientConfigs: undefined as unknown as [],
        },
      ],
    });
    mockUseFetch.mockReturnValue(
      standardUseFetchStateObject({
        data: [],
        loaded: true,
      }),
    );

    testHook(useWorkbenchFeatureStores)();
    const callbackArg = mockUseFetch.mock.calls[0]?.[0];
    const result = await callbackArg();

    expect(result).toStrictEqual([]);
  });

  it('should filter out namespaces with non-array clientConfigs and process valid ones', async () => {
    mockGetWorkbenchFeatureStores.mockResolvedValue({
      namespaces: [
        {
          namespace: 'valid-namespace',
          clientConfigs: [
            {
              configName: 'valid-config',
              projectName: 'valid_project',
              hasAccessToFeatureStore: true,
            },
          ],
        },
        {
          namespace: 'invalid-namespace',
          clientConfigs: null as unknown as [],
        },
      ],
    });
    mockUseFetch.mockReturnValue(
      standardUseFetchStateObject({
        data: [
          {
            namespace: 'valid-namespace',
            configName: 'valid-config',
            projectName: 'valid_project',
            configMap: null,
            hasAccessToFeatureStore: true,
          },
        ],
        loaded: true,
      }),
    );

    testHook(useWorkbenchFeatureStores)();
    const callbackArg = mockUseFetch.mock.calls[0]?.[0];
    const result = await callbackArg();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      namespace: 'valid-namespace',
      configName: 'valid-config',
      projectName: 'valid_project',
      hasAccessToFeatureStore: true,
    });
  });
});
