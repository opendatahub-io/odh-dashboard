/* eslint-disable camelcase */
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockFeatureService } from '../../__mocks__/mockFeatureServices';
import { useFeatureStoreAPI } from '../../FeatureStoreContext';
import { FeatureService } from '../../types/featureServices';
import useFeatureServiceByName from '../useFeatureServiceByName';

jest.mock('../../FeatureStoreContext', () => ({
  useFeatureStoreAPI: jest.fn(),
}));

const useFeatureStoreAPIMock = jest.mocked(useFeatureStoreAPI);
const mockGetFeatureServiceByName = jest.fn();

describe('useFeatureServiceByName', () => {
  const mockFeatureServiceData: FeatureService = mockFeatureService({
    name: 'feature-service-1',
  });

  const defaultFeatureService: FeatureService = {
    spec: {
      name: '',
      features: [],
      tags: {},
      description: '',
      owner: '',
    },
    meta: {
      createdTimestamp: '',
      lastUpdatedTimestamp: '',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return error with correct message when feature service name is not provided', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureServiceByName: mockGetFeatureServiceByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    const renderResult = testHook(useFeatureServiceByName)('test-project', undefined);

    expect(renderResult.result.current.data).toEqual(defaultFeatureService);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(defaultFeatureService);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toEqual(
      new Error('Feature service name is required'),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatureServiceByName).not.toHaveBeenCalled();
  });

  it('should return error when API is not available', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureServiceByName: mockGetFeatureServiceByName,
      },
      apiAvailable: false,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    const renderResult = testHook(useFeatureServiceByName)('test-project', 'feature-service-1');

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.error).toEqual(new Error('API not yet available'));
    expect(renderResult.result.current.loaded).toBe(false);
    expect(mockGetFeatureServiceByName).not.toHaveBeenCalled();
  });

  it('should return error when project is not provided', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureServiceByName: mockGetFeatureServiceByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    const renderResult = testHook(useFeatureServiceByName)(undefined, 'feature-service-1');

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.error).toEqual(new Error('Project is required'));
    expect(renderResult.result.current.loaded).toBe(false);
    expect(mockGetFeatureServiceByName).not.toHaveBeenCalled();
  });

  it('should return successful data when API is available', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureServiceByName: mockGetFeatureServiceByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetFeatureServiceByName.mockResolvedValue(mockFeatureServiceData);

    const renderResult = testHook(useFeatureServiceByName)('test-project', 'feature-service-1');

    expect(renderResult.result.current.data).toEqual(defaultFeatureService);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.data).toEqual(mockFeatureServiceData);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatureServiceByName).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'test-project',
      'feature-service-1',
    );
  });
});
