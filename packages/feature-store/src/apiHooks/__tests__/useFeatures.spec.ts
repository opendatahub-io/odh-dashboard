/* eslint-disable camelcase */
import { testHook, standardUseFetchStateObject } from '@odh-dashboard/jest-config/hooks';
import { mockFeaturesList, mockEmptyFeaturesList } from '../../__mocks__/mockFeatures';
import { useFeatureStoreAPI } from '../../FeatureStoreContext';
import useFeatures from '../useFeatures';

jest.mock('../../FeatureStoreContext', () => ({
  useFeatureStoreAPI: jest.fn(),
}));

const useFeatureStoreAPIMock = jest.mocked(useFeatureStoreAPI);
const mockGetFeatures = jest.fn();

// Use mock data from mocks folder
const testFeaturesList = mockFeaturesList();
const defaultFeaturesList = mockEmptyFeaturesList();

describe('useFeatures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return successful features list when API is available', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatures: mockGetFeatures,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetFeatures.mockResolvedValue(testFeaturesList);

    const renderResult = testHook(useFeatures)();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: defaultFeaturesList }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: testFeaturesList, loaded: true }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatures).toHaveBeenCalledTimes(1);
    expect(mockGetFeatures).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      undefined,
    );
  });

  it('should return successful features list with project parameter', async () => {
    const projectName = 'my-project';

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatures: mockGetFeatures,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetFeatures.mockResolvedValue(testFeaturesList);

    const renderResult = testHook(useFeatures)(projectName);

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: defaultFeaturesList }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: testFeaturesList, loaded: true }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatures).toHaveBeenCalledTimes(1);
    expect(mockGetFeatures).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      projectName,
    );
  });

  it('should handle errors when API call fails', async () => {
    const error = new Error('API call failed');

    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatures: mockGetFeatures,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetFeatures.mockRejectedValue(error);

    const renderResult = testHook(useFeatures)();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: defaultFeaturesList }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: defaultFeaturesList,
        loaded: false,
        error,
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatures).toHaveBeenCalledTimes(1);
  });

  it('should handle when API is not available', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatures: mockGetFeatures,
      },
      apiAvailable: false,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    const renderResult = testHook(useFeatures)();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: defaultFeaturesList }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: defaultFeaturesList,
        loaded: false,
        error: new Error('API not yet available'),
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatures).not.toHaveBeenCalled();
  });

  it('should update when project parameter changes', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatures: mockGetFeatures,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetFeatures.mockResolvedValue(testFeaturesList);

    const renderResult = testHook(useFeatures)('project-1');

    // Wait for initial load
    await renderResult.waitForNextUpdate();

    expect(mockGetFeatures).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'project-1',
    );

    // Change project parameter
    renderResult.rerender('project-2');
    await renderResult.waitForNextUpdate();

    expect(mockGetFeatures).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'project-2',
    );
    expect(mockGetFeatures).toHaveBeenCalledTimes(2);
  });

  it('should handle refresh functionality', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatures: mockGetFeatures,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetFeatures.mockResolvedValue(testFeaturesList);

    const renderResult = testHook(useFeatures)();

    // Wait for initial load
    await renderResult.waitForNextUpdate();
    expect(mockGetFeatures).toHaveBeenCalledTimes(1);

    // Trigger refresh
    await renderResult.result.current.refresh();
    expect(mockGetFeatures).toHaveBeenCalledTimes(2);
  });
});
