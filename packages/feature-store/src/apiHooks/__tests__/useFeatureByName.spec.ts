/* eslint-disable camelcase */
import { testHook, standardUseFetchStateObject } from '@odh-dashboard/jest-config/hooks';
import { mockFeature } from '../../__mocks__/mockFeatures';
import { useFeatureStoreAPI } from '../../FeatureStoreContext';
import useFeatureByName from '../useFeatureByName';

jest.mock('../../FeatureStoreContext', () => ({
  useFeatureStoreAPI: jest.fn(),
}));

const useFeatureStoreAPIMock = jest.mocked(useFeatureStoreAPI);
const mockGetFeatureByName = jest.fn();

const testFeature = mockFeature();
const defaultFeature = {
  name: '',
  featureView: '',
  type: '',
  project: '',
  owner: '',
  tags: {},
  description: '',
};

describe('useFeatureByName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return successful feature when API is available and all parameters are provided', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureByName: mockGetFeatureByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetFeatureByName.mockResolvedValue(testFeature);

    const renderResult = testHook(useFeatureByName)(
      'test-project',
      'test-feature-view',
      'test-feature',
    );

    expect(renderResult).hookToStrictEqual(standardUseFetchStateObject({ data: defaultFeature }));
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: testFeature, loaded: true }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatureByName).toHaveBeenCalledTimes(1);
    expect(mockGetFeatureByName).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'test-project',
      'test-feature-view',
      'test-feature',
    );
  });

  it('should return error when API is not available', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureByName: mockGetFeatureByName,
      },
      apiAvailable: false,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    const renderResult = testHook(useFeatureByName)(
      'test-project',
      'test-feature-view',
      'test-feature',
    );

    expect(renderResult).hookToStrictEqual(standardUseFetchStateObject({ data: defaultFeature }));
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: defaultFeature,
        error: new Error('API not yet available'),
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatureByName).not.toHaveBeenCalled();
  });

  it('should return error when project is not provided', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureByName: mockGetFeatureByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    const renderResult = testHook(useFeatureByName)(undefined, 'test-feature-view', 'test-feature');

    expect(renderResult).hookToStrictEqual(standardUseFetchStateObject({ data: defaultFeature }));
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: defaultFeature,
        error: new Error('Project is required'),
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatureByName).not.toHaveBeenCalled();
  });

  it('should return error when feature name is not provided', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureByName: mockGetFeatureByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    const renderResult = testHook(useFeatureByName)('test-project', 'test-feature-view', undefined);

    expect(renderResult).hookToStrictEqual(standardUseFetchStateObject({ data: defaultFeature }));
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: defaultFeature,
        error: new Error('Feature name is required'),
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatureByName).not.toHaveBeenCalled();
  });

  it('should return error when feature view name is not provided', async () => {
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureByName: mockGetFeatureByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    const renderResult = testHook(useFeatureByName)('test-project', undefined, 'test-feature');

    expect(renderResult).hookToStrictEqual(standardUseFetchStateObject({ data: defaultFeature }));
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: defaultFeature,
        error: new Error('Feature view name is required'),
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatureByName).not.toHaveBeenCalled();
  });

  it('should return error when API call fails', async () => {
    const apiError = new Error('Feature not found');
    useFeatureStoreAPIMock.mockReturnValue({
      api: {
        getFeatureByName: mockGetFeatureByName,
      },
      apiAvailable: true,
    } as unknown as ReturnType<typeof useFeatureStoreAPI>);

    mockGetFeatureByName.mockRejectedValue(apiError);

    const renderResult = testHook(useFeatureByName)(
      'test-project',
      'test-feature-view',
      'test-feature',
    );

    expect(renderResult).hookToStrictEqual(standardUseFetchStateObject({ data: defaultFeature }));
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: defaultFeature,
        error: apiError,
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockGetFeatureByName).toHaveBeenCalledTimes(1);
    expect(mockGetFeatureByName).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
      'test-project',
      'test-feature-view',
      'test-feature',
    );
  });
});
