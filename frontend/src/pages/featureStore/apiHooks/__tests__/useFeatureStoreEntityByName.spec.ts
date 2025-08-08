/* eslint-disable camelcase */
import { testHook } from '#~/__tests__/unit/testUtils/hooks';
import { useFeatureStoreAPI } from '#~/pages/featureStore/FeatureStoreContext.tsx';
import { mockEntity } from '#~/__mocks__/mockEntities.ts';
import { Entity } from '#~/pages/featureStore/types/entities';
import useFeatureStoreEntityByName from '#~/pages/featureStore/apiHooks/useFeatureStoreEntityByName.ts';

jest.mock('#~/pages/featureStore/FeatureStoreContext.tsx', () => ({
  useFeatureStoreAPI: jest.fn(),
}));

const useFeatureStoreAPIMock = jest.mocked(useFeatureStoreAPI);
const mockGetEntityByName = jest.fn();

describe('useFeatureStoreEntityByName', () => {
  const mockEntityData: Entity = mockEntity({ spec: { name: 'entity-1' } });

  const defaultEntity: Entity = {
    spec: {
      name: '',
      valueType: '',
      description: '',
      joinKey: '',
      tags: {},
      owner: '',
    },
    meta: {
      createdTimestamp: '',
      lastUpdatedTimestamp: '',
    },
    project: '',
    featureDefinition: '',
    dataSources: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return successful entity data when API is available', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getEntityByName: mockGetEntityByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetEntityByName.mockResolvedValue(mockEntityData);

    const renderResult = testHook(useFeatureStoreEntityByName)('test-project', 'entity-1');

    expect(renderResult.result.current.data).toEqual(defaultEntity);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(mockEntityData);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetEntityByName).toHaveBeenCalledTimes(1);
    expect(mockGetEntityByName).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'test-project',
      'entity-1',
    );
  });

  it('should handle errors when API call fails', async () => {
    const testError = new Error('Failed to fetch entity');

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getEntityByName: mockGetEntityByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetEntityByName.mockRejectedValue(testError);

    const renderResult = testHook(useFeatureStoreEntityByName)('test-project', 'entity-1');

    expect(renderResult.result.current.data).toEqual(defaultEntity);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(defaultEntity);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toEqual(testError);
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetEntityByName).toHaveBeenCalledTimes(1);
  });

  it('should return error when API is not available', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getEntityByName: mockGetEntityByName,
      },
      apiAvailable: false,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    const renderResult = testHook(useFeatureStoreEntityByName)('test-project', 'entity-1');

    expect(renderResult.result.current.data).toEqual(defaultEntity);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(defaultEntity);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toEqual(new Error('API not yet available'));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetEntityByName).not.toHaveBeenCalled();
  });

  it('should return error when project is not provided', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getEntityByName: mockGetEntityByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    const renderResult = testHook(useFeatureStoreEntityByName)(undefined, 'entity-1');

    expect(renderResult.result.current.data).toEqual(defaultEntity);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(defaultEntity);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toEqual(new Error('Project is required'));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetEntityByName).not.toHaveBeenCalled();
  });

  it('should return error when entity name is not provided', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getEntityByName: mockGetEntityByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    const renderResult = testHook(useFeatureStoreEntityByName)('test-project', undefined);

    expect(renderResult.result.current.data).toEqual(defaultEntity);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(defaultEntity);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toEqual(new Error('Entity name is required'));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetEntityByName).not.toHaveBeenCalled();
  });

  it('should be stable when re-rendered with same parameters', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getEntityByName: mockGetEntityByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetEntityByName.mockResolvedValue(mockEntityData);

    const renderResult = testHook(useFeatureStoreEntityByName)('test-project', 'entity-1');

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToHaveUpdateCount(2);

    renderResult.rerender('test-project', 'entity-1');
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
        getEntityByName: mockGetEntityByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetEntityByName.mockResolvedValue(mockEntityData);

    const renderResult = testHook(useFeatureStoreEntityByName)('project-1', 'entity-1');

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetEntityByName).toHaveBeenCalledTimes(1);
    expect(mockGetEntityByName).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'project-1',
      'entity-1',
    );

    renderResult.rerender('project-2', 'entity-1');

    await renderResult.waitForNextUpdate();
    expect(mockGetEntityByName).toHaveBeenCalledTimes(2);
    expect(mockGetEntityByName).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'project-2',
      'entity-1',
    );
  });

  it('should refetch when entity name parameter changes', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getEntityByName: mockGetEntityByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetEntityByName.mockResolvedValue(mockEntityData);

    const renderResult = testHook(useFeatureStoreEntityByName)('test-project', 'entity-1');

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetEntityByName).toHaveBeenCalledTimes(1);
    expect(mockGetEntityByName).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'test-project',
      'entity-1',
    );

    renderResult.rerender('test-project', 'entity-2');

    await renderResult.waitForNextUpdate();
    expect(mockGetEntityByName).toHaveBeenCalledTimes(2);
    expect(mockGetEntityByName).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'test-project',
      'entity-2',
    );
  });

  it('should handle refresh functionality', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getEntityByName: mockGetEntityByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetEntityByName.mockResolvedValue(mockEntityData);

    const renderResult = testHook(useFeatureStoreEntityByName)('test-project', 'entity-1');

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetEntityByName).toHaveBeenCalledTimes(1);

    const updatedEntityData: Entity = mockEntity({ spec: { name: 'entity-2' } });
    mockGetEntityByName.mockResolvedValue(updatedEntityData);

    renderResult.result.current.refresh();

    await renderResult.waitForNextUpdate();
    expect(mockGetEntityByName).toHaveBeenCalledTimes(2);
    expect(renderResult.result.current.data).toEqual(updatedEntityData);
  });

  it('should handle API availability change', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getEntityByName: mockGetEntityByName,
      },
      apiAvailable: false,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    const renderResult = testHook(useFeatureStoreEntityByName)('test-project', 'entity-1');

    await renderResult.waitForNextUpdate();
    expect(renderResult.result.current.data).toEqual(defaultEntity);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toEqual(new Error('API not yet available'));

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getEntityByName: mockGetEntityByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetEntityByName.mockResolvedValue(mockEntityData);

    renderResult.rerender('test-project', 'entity-1');

    await renderResult.waitForNextUpdate();
    expect(renderResult.result.current.data).toEqual(mockEntityData);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(mockGetEntityByName).toHaveBeenCalledTimes(1);
  });

  it('should handle project parameter going from defined to undefined', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getEntityByName: mockGetEntityByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetEntityByName.mockResolvedValue(mockEntityData);

    const renderResult = testHook(useFeatureStoreEntityByName)('test-project', 'entity-1');

    await renderResult.waitForNextUpdate();
    expect(mockGetEntityByName).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'test-project',
      'entity-1',
    );

    renderResult.rerender(undefined, 'entity-1');

    await renderResult.waitForNextUpdate();
    expect(renderResult.result.current.error).toEqual(new Error('Project is required'));
    expect(mockGetEntityByName).toHaveBeenCalledTimes(1); // Should not call API when project is undefined
  });

  it('should handle entity name parameter going from defined to undefined', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getEntityByName: mockGetEntityByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetEntityByName.mockResolvedValue(mockEntityData);

    const renderResult = testHook(useFeatureStoreEntityByName)('test-project', 'entity-1');

    await renderResult.waitForNextUpdate();
    expect(mockGetEntityByName).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'test-project',
      'entity-1',
    );

    renderResult.rerender('test-project', undefined);

    await renderResult.waitForNextUpdate();
    expect(renderResult.result.current.error).toEqual(new Error('Entity name is required'));
    expect(mockGetEntityByName).toHaveBeenCalledTimes(1); // Should not call API when entity name is undefined
  });
});
