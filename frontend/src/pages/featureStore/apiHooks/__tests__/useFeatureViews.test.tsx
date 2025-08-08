/* eslint-disable camelcase */
import { testHook } from '#~/__tests__/unit/testUtils/hooks';
import { useFeatureStoreAPI } from '#~/pages/featureStore/FeatureStoreContext.tsx';
import useFeatureViews from '#~/pages/featureStore/apiHooks/useFeatureViews.tsx';
import { mockFeatureView } from '#~/__mocks__/mockFeatureViews.ts';
import { FeatureViewsList } from '#~/pages/featureStore/types/featureView';

jest.mock('#~/pages/featureStore/FeatureStoreContext.tsx', () => ({
  useFeatureStoreAPI: jest.fn(),
}));

const useFeatureStoreAPIMock = jest.mocked(useFeatureStoreAPI);
const mockGetFeatureViews = jest.fn();

describe('useFeatureViews', () => {
  const mockFeatureViewsList: FeatureViewsList = {
    featureViews: [mockFeatureView(), mockFeatureView()],
    pagination: {
      totalCount: 2,
      totalPages: 1,
    },
  };

  const defaultFeatureViewsList: FeatureViewsList = {
    featureViews: [],
    pagination: {
      totalCount: 0,
      totalPages: 0,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return successful feature views list when API is available', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureViews: mockGetFeatureViews,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetFeatureViews.mockResolvedValue(mockFeatureViewsList);

    const renderResult = testHook(useFeatureViews)({});

    expect(renderResult.result.current.data).toEqual(defaultFeatureViewsList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(mockFeatureViewsList);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatureViews).toHaveBeenCalledTimes(1);
    expect(mockGetFeatureViews).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });

  it('should return successful feature views list with project parameter', async () => {
    const projectName = 'test-project';

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureViews: mockGetFeatureViews,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetFeatureViews.mockResolvedValue(mockFeatureViewsList);

    const renderResult = testHook(useFeatureViews)({ project: projectName });

    expect(renderResult.result.current.data).toEqual(defaultFeatureViewsList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(mockFeatureViewsList);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatureViews).toHaveBeenCalledTimes(1);
    expect(mockGetFeatureViews).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      projectName,
      undefined,
      undefined,
      undefined,
    );
  });

  it('should return successful feature views list with project and entity parameters', async () => {
    const projectName = 'test-project';
    const entityName = 'test-entity';

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureViews: mockGetFeatureViews,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetFeatureViews.mockResolvedValue(mockFeatureViewsList);

    const renderResult = testHook(useFeatureViews)({ project: projectName, entity: entityName });

    expect(renderResult.result.current.data).toEqual(defaultFeatureViewsList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(mockFeatureViewsList);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatureViews).toHaveBeenCalledTimes(1);
    expect(mockGetFeatureViews).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      projectName,
      entityName,
      undefined,
      undefined,
    );
  });

  it('should handle errors when API call fails', async () => {
    const testError = new Error('Failed to fetch feature views');

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureViews: mockGetFeatureViews,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetFeatureViews.mockRejectedValue(testError);

    const renderResult = testHook(useFeatureViews)({});

    expect(renderResult.result.current.data).toEqual(defaultFeatureViewsList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(defaultFeatureViewsList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toEqual(testError);
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatureViews).toHaveBeenCalledTimes(1);
  });

  it('should return error when API is not available', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureViews: mockGetFeatureViews,
      },
      apiAvailable: false,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    const renderResult = testHook(useFeatureViews)({});

    expect(renderResult.result.current.data).toEqual(defaultFeatureViewsList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(defaultFeatureViewsList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toEqual(new Error('API not yet available'));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatureViews).not.toHaveBeenCalled();
  });

  it('should be stable when re-rendered with same parameters', async () => {
    const projectName = 'test-project';
    const entityName = 'test-entity';

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureViews: mockGetFeatureViews,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetFeatureViews.mockResolvedValue(mockFeatureViewsList);

    const renderResult = testHook(useFeatureViews)({ project: projectName, entity: entityName });

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToHaveUpdateCount(2);

    renderResult.rerender({ project: projectName, entity: entityName });
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable({
      data: false,
      loaded: true,
      error: true,
      refresh: true,
    });
  });

  it('should refetch when project parameter changes', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureViews: mockGetFeatureViews,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetFeatureViews.mockResolvedValue(mockFeatureViewsList);

    const renderResult = testHook(useFeatureViews)({ project: 'project-1' });

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatureViews).toHaveBeenCalledTimes(1);
    expect(mockGetFeatureViews).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'project-1',
      undefined,
      undefined,
      undefined,
    );

    renderResult.rerender({ project: 'project-2' });

    await renderResult.waitForNextUpdate();
    expect(mockGetFeatureViews).toHaveBeenCalledTimes(2);
    expect(mockGetFeatureViews).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'project-2',
      undefined,
      undefined,
      undefined,
    );
  });

  it('should refetch when entity parameter changes', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureViews: mockGetFeatureViews,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetFeatureViews.mockResolvedValue(mockFeatureViewsList);

    const renderResult = testHook(useFeatureViews)({ project: 'project-1', entity: 'entity-1' });

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatureViews).toHaveBeenCalledTimes(1);
    expect(mockGetFeatureViews).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'project-1',
      'entity-1',
      undefined,
      undefined,
    );

    renderResult.rerender({ project: 'project-1', entity: 'entity-2' });

    await renderResult.waitForNextUpdate();
    expect(mockGetFeatureViews).toHaveBeenCalledTimes(2);
    expect(mockGetFeatureViews).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'project-1',
      'entity-2',
      undefined,
      undefined,
    );
  });

  it('should handle refresh functionality', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureViews: mockGetFeatureViews,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetFeatureViews.mockResolvedValue(mockFeatureViewsList);

    const renderResult = testHook(useFeatureViews)({});

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatureViews).toHaveBeenCalledTimes(1);

    const updatedFeatureViewsList: FeatureViewsList = {
      featureViews: [mockFeatureView()],
      pagination: {
        totalCount: 1,
        totalPages: 1,
      },
    };
    mockGetFeatureViews.mockResolvedValue(updatedFeatureViewsList);

    renderResult.result.current.refresh();

    await renderResult.waitForNextUpdate();
    expect(mockGetFeatureViews).toHaveBeenCalledTimes(2);
    expect(renderResult.result.current.data).toEqual(updatedFeatureViewsList);
  });
});
