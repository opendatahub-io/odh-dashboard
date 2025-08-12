/* eslint-disable camelcase */
import { testHook } from '@odh-dashboard/internal/__tests__/unit/testUtils/hooks';
import { mockFeatureService } from '@odh-dashboard/internal/__mocks__/mockFeatureServices';
import { FeatureServicesList } from '../../types/featureServices';
import { useFeatureStoreAPI } from '../../FeatureStoreContext';
import useFeatureServices from '../useFeatureServices';

jest.mock('../../FeatureStoreContext', () => ({
  useFeatureStoreAPI: jest.fn(),
}));

const useFeatureStoreAPIMock = jest.mocked(useFeatureStoreAPI);
const mockGetFeatureServices = jest.fn();

describe('useFeatureServices', () => {
  const mockFeatureServicesList: FeatureServicesList = {
    featureServices: [
      mockFeatureService({ name: 'feature-service-1' }),
      mockFeatureService({ name: 'feature-service-2' }),
    ],
    pagination: {
      totalCount: 2,
      totalPages: 1,
    },
    relationships: {},
  };

  const defaultFeatureServicesList: FeatureServicesList = {
    featureServices: [],
    pagination: {
      totalCount: 0,
      totalPages: 0,
    },
    relationships: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return successful feature services list when API is available', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureServices: mockGetFeatureServices,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetFeatureServices.mockResolvedValue(mockFeatureServicesList);

    const renderResult = testHook(useFeatureServices)();

    expect(renderResult.result.current.data).toEqual(defaultFeatureServicesList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(mockFeatureServicesList);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatureServices).toHaveBeenCalledTimes(1);
    expect(mockGetFeatureServices).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      undefined,
      undefined,
    );
  });

  it('should return successful feature services list with project parameter', async () => {
    const projectName = 'test-project';

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureServices: mockGetFeatureServices,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetFeatureServices.mockResolvedValue(mockFeatureServicesList);

    const renderResult = testHook(useFeatureServices)(projectName);

    expect(renderResult.result.current.data).toEqual(defaultFeatureServicesList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(mockFeatureServicesList);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatureServices).toHaveBeenCalledTimes(1);
    expect(mockGetFeatureServices).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      projectName,
      undefined,
    );
  });

  it('should return successful feature services list with project and featureView parameters', async () => {
    const projectName = 'test-project';
    const featureViewName = 'test-feature-view';

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureServices: mockGetFeatureServices,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetFeatureServices.mockResolvedValue(mockFeatureServicesList);

    const renderResult = testHook(useFeatureServices)(projectName, featureViewName);

    expect(renderResult.result.current.data).toEqual(defaultFeatureServicesList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(mockFeatureServicesList);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatureServices).toHaveBeenCalledTimes(1);
    expect(mockGetFeatureServices).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      projectName,
      featureViewName,
    );
  });

  it('should handle errors when API call fails', async () => {
    const testError = new Error('Failed to fetch feature services');

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureServices: mockGetFeatureServices,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetFeatureServices.mockRejectedValue(testError);

    const renderResult = testHook(useFeatureServices)();

    expect(renderResult.result.current.data).toEqual(defaultFeatureServicesList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(defaultFeatureServicesList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toEqual(testError);
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatureServices).toHaveBeenCalledTimes(1);
  });

  it('should return error when API is not available', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureServices: mockGetFeatureServices,
      },
      apiAvailable: false,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    const renderResult = testHook(useFeatureServices)();

    expect(renderResult.result.current.data).toEqual(defaultFeatureServicesList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(defaultFeatureServicesList);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toEqual(new Error('API not yet available'));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatureServices).not.toHaveBeenCalled();
  });

  it('should be stable when re-rendered with same parameters', async () => {
    const projectName = 'test-project';

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureServices: mockGetFeatureServices,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetFeatureServices.mockResolvedValue(mockFeatureServicesList);

    const renderResult = testHook(useFeatureServices)(projectName);

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
        getFeatureServices: mockGetFeatureServices,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetFeatureServices.mockResolvedValue(mockFeatureServicesList);

    const renderResult = testHook(useFeatureServices)('project-1');

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatureServices).toHaveBeenCalledTimes(1);
    expect(mockGetFeatureServices).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'project-1',
      undefined,
    );

    renderResult.rerender('project-2');

    await renderResult.waitForNextUpdate();
    expect(mockGetFeatureServices).toHaveBeenCalledTimes(2);
    expect(mockGetFeatureServices).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'project-2',
      undefined,
    );
  });

  it('should refetch when featureView parameter changes', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureServices: mockGetFeatureServices,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetFeatureServices.mockResolvedValue(mockFeatureServicesList);

    const renderResult = testHook(useFeatureServices)('project-1', 'feature-view-1');

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatureServices).toHaveBeenCalledTimes(1);
    expect(mockGetFeatureServices).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'project-1',
      'feature-view-1',
    );

    renderResult.rerender('project-1', 'feature-view-2');

    await renderResult.waitForNextUpdate();
    expect(mockGetFeatureServices).toHaveBeenCalledTimes(2);
    expect(mockGetFeatureServices).toHaveBeenLastCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'project-1',
      'feature-view-2',
    );
  });

  it('should handle empty feature services list', async () => {
    const emptyFeatureServicesList: FeatureServicesList = {
      featureServices: [],
      pagination: {
        totalCount: 0,
        totalPages: 0,
      },
      relationships: {},
    };

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureServices: mockGetFeatureServices,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetFeatureServices.mockResolvedValue(emptyFeatureServicesList);

    const renderResult = testHook(useFeatureServices)();

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(emptyFeatureServicesList);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(2);
  });
});
