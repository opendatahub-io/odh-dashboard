import { testHook, standardUseFetchStateObject } from '@odh-dashboard/jest-config/hooks';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import type { IsAreaAvailableStatus } from '@odh-dashboard/plugin-core/areas';
import useTemplateOrder from '../useTemplateOrder';

jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  ...jest.requireActual('@odh-dashboard/plugin-core/areas'),
  useIsAreaAvailable: jest.fn(),
}));

const mockUseIsAreaAvailable = jest.mocked(useIsAreaAvailable);

const mockAreaStatus = (status: boolean): IsAreaAvailableStatus => ({
  status,
  devFlags: null,
  featureFlags: null,
  reliantAreas: null,
  requiredCapabilities: null,
  requiredComponents: null,
  customCondition: () => false,
});

describe('useTemplateOrder', () => {
  const mockFetcher = jest.fn<Promise<string[]>, [string]>();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsAreaAvailable.mockReturnValue(mockAreaStatus(true));
  });

  it('should return fetched template order', async () => {
    mockFetcher.mockResolvedValue(['runtime-b', 'runtime-a']);

    const renderResult = testHook(useTemplateOrder)('test-ns', mockFetcher);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: ['runtime-b', 'runtime-a'],
        loaded: true,
      }),
    );
    expect(mockFetcher).toHaveBeenCalledWith('test-ns');
  });

  it('should error when namespace is undefined', async () => {
    const renderResult = testHook(useTemplateOrder)(undefined, mockFetcher);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: [],
        error: new Error('No namespace provided'),
      }),
    );
    expect(mockFetcher).not.toHaveBeenCalled();
  });
});
