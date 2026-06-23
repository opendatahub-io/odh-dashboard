import { standardUseFetchStateObject, testHook } from '@odh-dashboard/jest-config/hooks';
import { getFeatureStoreProjects, FeatureStoreProject } from '#~/api/featureStore/custom';
import { useFeatureStoreProjects } from '#~/pages/projects/screens/spawner/featureStore/useFeatureStoreProjects';

jest.mock('#~/api/featureStore/custom', () => ({
  getFeatureStoreProjects: jest.fn(),
}));

jest.mock('#~/utilities/useFetch', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockGetFeatureStoreProjects = jest.mocked(getFeatureStoreProjects);
const mockUseFetch = jest.mocked(require('#~/utilities/useFetch').default);

describe('useFeatureStoreProjects', () => {
  const mockProjectsResponse = {
    connectedWorkbenches: [
      {
        feastProjectName: 'credit_scoring_local',
        namespace: 'credit-namespace',
        description: 'Credit scoring features',
        permissionLevel: ['read', 'write'],
        connectedWorkbenches: [
          {
            workbenchName: 'feast-workbench',
            workbenchNamespace: 'my-ds-project',
            projectName: 'my-ds-project',
          },
        ],
      },
      {
        feastProjectName: 'banking',
        namespace: 'test-feast-banking',
        permissionLevel: ['read'],
        connectedWorkbenches: [],
      },
    ],
  };

  const expectedFeatureStoreProjects: FeatureStoreProject[] =
    mockProjectsResponse.connectedWorkbenches;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFeatureStoreProjects.mockResolvedValue(mockProjectsResponse);
    mockUseFetch.mockReturnValue(standardUseFetchStateObject({ data: [] }));
  });

  it('should call getFeatureStoreProjects API when callback executes', () => {
    testHook(useFeatureStoreProjects)();
    expect(mockUseFetch).toHaveBeenCalled();
    const callbackArg = mockUseFetch.mock.calls[0]?.[0];
    expect(callbackArg).toBeDefined();
    expect(typeof callbackArg).toBe('function');

    callbackArg();
    expect(mockGetFeatureStoreProjects).toHaveBeenCalled();
  });

  it('should return empty array initially', () => {
    const renderResult = testHook(useFeatureStoreProjects)();
    const { featureStoreProjects, loaded, error } = renderResult.result.current;

    expect(featureStoreProjects).toStrictEqual([]);
    expect(loaded).toBe(false);
    expect(error).toBeUndefined();
  });

  it('should transform backend response to FeatureStoreProject array', async () => {
    mockUseFetch.mockReturnValue(
      standardUseFetchStateObject({
        data: expectedFeatureStoreProjects,
        loaded: true,
      }),
    );

    const renderResult = testHook(useFeatureStoreProjects)();
    const { featureStoreProjects, loaded, error } = renderResult.result.current;

    expect(featureStoreProjects).toStrictEqual(expectedFeatureStoreProjects);
    expect(loaded).toBe(true);
    expect(error).toBeUndefined();
  });

  it('should handle empty connectedWorkbenches array', async () => {
    mockGetFeatureStoreProjects.mockResolvedValue({ connectedWorkbenches: [] });
    mockUseFetch.mockReturnValue(
      standardUseFetchStateObject({
        data: [],
        loaded: true,
      }),
    );

    const renderResult = testHook(useFeatureStoreProjects)();
    const { featureStoreProjects, loaded } = renderResult.result.current;

    expect(featureStoreProjects).toHaveLength(0);
    expect(loaded).toBe(true);
  });

  it('should handle error state', async () => {
    const error = new Error('Failed to fetch feature store projects');
    mockUseFetch.mockReturnValue(
      standardUseFetchStateObject({
        data: [],
        loaded: false,
        error,
      }),
    );

    const renderResult = testHook(useFeatureStoreProjects)();
    const { error: hookError, loaded, featureStoreProjects } = renderResult.result.current;

    expect(hookError).toBe(error);
    expect(loaded).toBe(false);
    expect(featureStoreProjects).toHaveLength(0);
  });

  it('should provide refresh function', () => {
    const renderResult = testHook(useFeatureStoreProjects)();
    const { refresh } = renderResult.result.current;

    expect(typeof refresh).toBe('function');
  });

  it('should preserve project fields from backend response', async () => {
    mockUseFetch.mockReturnValue(
      standardUseFetchStateObject({
        data: expectedFeatureStoreProjects,
        loaded: true,
      }),
    );

    const renderResult = testHook(useFeatureStoreProjects)();
    const { featureStoreProjects } = renderResult.result.current;

    const creditScoring = featureStoreProjects.find(
      (project) => project.feastProjectName === 'credit_scoring_local',
    );
    const banking = featureStoreProjects.find((project) => project.feastProjectName === 'banking');

    expect(creditScoring).toMatchObject({
      namespace: 'credit-namespace',
      description: 'Credit scoring features',
      permissionLevel: ['read', 'write'],
    });
    expect(creditScoring?.connectedWorkbenches).toHaveLength(1);
    expect(banking).toMatchObject({
      namespace: 'test-feast-banking',
      permissionLevel: ['read'],
      connectedWorkbenches: [],
    });
  });

  it('should throw error when connectedWorkbenches is not an array', async () => {
    mockGetFeatureStoreProjects.mockResolvedValue({
      connectedWorkbenches: null as unknown as FeatureStoreProject[],
    });

    testHook(useFeatureStoreProjects)();
    const callbackArg = mockUseFetch.mock.calls[0]?.[0];

    await expect(callbackArg()).rejects.toThrow('Failed to load feature store projects');
  });

  it('should throw error when connectedWorkbenches is undefined', async () => {
    mockGetFeatureStoreProjects.mockResolvedValue({
      connectedWorkbenches: undefined as unknown as FeatureStoreProject[],
    });

    testHook(useFeatureStoreProjects)();
    const callbackArg = mockUseFetch.mock.calls[0]?.[0];

    await expect(callbackArg()).rejects.toThrow('Failed to load feature store projects');
  });

  it('should return connectedWorkbenches from callback when API succeeds', async () => {
    testHook(useFeatureStoreProjects)();
    const callbackArg = mockUseFetch.mock.calls[0]?.[0];
    const result = await callbackArg();

    expect(result).toStrictEqual(expectedFeatureStoreProjects);
  });
});
