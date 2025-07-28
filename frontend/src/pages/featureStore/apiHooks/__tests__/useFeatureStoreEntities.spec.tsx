/* eslint-disable camelcase */
import { testHook } from '#~/__tests__/unit/testUtils/hooks';
import { useFeatureStoreAPI } from '#~/pages/featureStore/FeatureStoreContext.tsx';
import useFeatureStoreEntities from '#~/pages/featureStore/apiHooks/useFeatureStoreEnitites.tsx';
import { mockEntity, mockEntities } from '#~/__mocks__/mockEntities.ts';
import { EntityList } from '#~/pages/featureStore/types/entities';

jest.mock('#~/pages/featureStore/FeatureStoreContext.tsx', () => ({
  useFeatureStoreAPI: jest.fn(),
}));

const useFeatureStoreAPIMock = jest.mocked(useFeatureStoreAPI);
const mockGetEntities = jest.fn();

describe('useFeatureStoreEntities', () => {
  const mockEntityList: EntityList = mockEntities({
    entities: [
      mockEntity({ spec: { name: 'entity-1' } }),
      mockEntity({ spec: { name: 'entity-2' } }),
    ],
  });

  const defaultEntityList: EntityList = {
    entities: [],
    pagination: {
      page: 0,
      limit: 0,
      total_count: 0,
      total_pages: 0,
      has_next: false,
      has_previous: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return successful entity list when API is available', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getEntities: mockGetEntities,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetEntities.mockResolvedValue(mockEntityList);

    const renderResult = testHook(useFeatureStoreEntities)();

    expect(renderResult.result.current.data).toEqual(defaultEntityList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(mockEntityList);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetEntities).toHaveBeenCalledTimes(1);
    expect(mockGetEntities).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      undefined,
    );
  });

  it('should return successful entity list with project parameter', async () => {
    const projectName = 'test-project';

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getEntities: mockGetEntities,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetEntities.mockResolvedValue(mockEntityList);

    const renderResult = testHook(useFeatureStoreEntities)(projectName);

    expect(renderResult.result.current.data).toEqual(defaultEntityList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(mockEntityList);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetEntities).toHaveBeenCalledTimes(1);
    expect(mockGetEntities).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      projectName,
    );
  });

  it('should handle errors when API call fails', async () => {
    const testError = new Error('Failed to fetch entities');

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getEntities: mockGetEntities,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetEntities.mockRejectedValue(testError);

    const renderResult = testHook(useFeatureStoreEntities)();

    expect(renderResult.result.current.data).toEqual(defaultEntityList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(defaultEntityList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toEqual(testError);
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetEntities).toHaveBeenCalledTimes(1);
  });

  it('should return error when API is not available', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getEntities: mockGetEntities,
      },
      apiAvailable: false,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    const renderResult = testHook(useFeatureStoreEntities)();

    expect(renderResult.result.current.data).toEqual(defaultEntityList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(defaultEntityList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toEqual(new Error('API not yet available'));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetEntities).not.toHaveBeenCalled();
  });

  it('should be stable when re-rendered with same parameters', async () => {
    const projectName = 'test-project';

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getEntities: mockGetEntities,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetEntities.mockResolvedValue(mockEntityList);

    const renderResult = testHook(useFeatureStoreEntities)(projectName);

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToHaveUpdateCount(2);

    renderResult.rerender(projectName);
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
        getEntities: mockGetEntities,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetEntities.mockResolvedValue(mockEntityList);

    const renderResult = testHook(useFeatureStoreEntities)('project-1');

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetEntities).toHaveBeenCalledTimes(1);
    expect(mockGetEntities).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'project-1',
    );

    renderResult.rerender('project-2');

    await renderResult.waitForNextUpdate();
    expect(mockGetEntities).toHaveBeenCalledTimes(2);
    expect(mockGetEntities).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'project-2',
    );
  });

  it('should handle refresh functionality', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getEntities: mockGetEntities,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetEntities.mockResolvedValue(mockEntityList);

    const renderResult = testHook(useFeatureStoreEntities)();

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetEntities).toHaveBeenCalledTimes(1);

    const updatedEntityList: EntityList = mockEntities({
      entities: [mockEntity({ spec: { name: 'entity-3' } })],
    });
    mockGetEntities.mockResolvedValue(updatedEntityList);

    renderResult.result.current.refresh();

    await renderResult.waitForNextUpdate();
    expect(mockGetEntities).toHaveBeenCalledTimes(2);
    expect(renderResult.result.current.data).toEqual(updatedEntityList);
  });

  it('should handle API availability change', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getEntities: mockGetEntities,
      },
      apiAvailable: false,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    const renderResult = testHook(useFeatureStoreEntities)();

    await renderResult.waitForNextUpdate();
    expect(renderResult.result.current.data).toEqual(defaultEntityList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toEqual(new Error('API not yet available'));

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getEntities: mockGetEntities,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetEntities.mockResolvedValue(mockEntityList);

    renderResult.rerender();

    await renderResult.waitForNextUpdate();
    expect(renderResult.result.current.data).toEqual(mockEntityList);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(mockGetEntities).toHaveBeenCalledTimes(1);
  });

  it('should handle empty entity list', async () => {
    const emptyEntityList: EntityList = mockEntities({ entities: [] });

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getEntities: mockGetEntities,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetEntities.mockResolvedValue(emptyEntityList);

    const renderResult = testHook(useFeatureStoreEntities)();

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(emptyEntityList);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should handle project parameter going from defined to undefined', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getEntities: mockGetEntities,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetEntities.mockResolvedValue(mockEntityList);

    const renderResult = testHook(useFeatureStoreEntities)('test-project');

    await renderResult.waitForNextUpdate();
    expect(mockGetEntities).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'test-project',
    );

    renderResult.rerender(undefined);

    await renderResult.waitForNextUpdate();
    expect(mockGetEntities).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      undefined,
    );
    expect(mockGetEntities).toHaveBeenCalledTimes(2);
  });
});
