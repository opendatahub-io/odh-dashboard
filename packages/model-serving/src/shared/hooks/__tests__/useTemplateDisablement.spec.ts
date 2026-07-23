import { testHook, standardUseFetchStateObject } from '@odh-dashboard/jest-config/hooks';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import type { IsAreaAvailableStatus } from '@odh-dashboard/plugin-core/areas';
import useTemplateDisablement from '../useTemplateDisablement';

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

describe('useTemplateDisablement', () => {
  const mockFetcher = jest.fn<Promise<string[]>, [string]>();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsAreaAvailable.mockReturnValue(mockAreaStatus(true));
  });

  it('should return fetched template disablement list', async () => {
    mockFetcher.mockResolvedValue(['disabled-runtime-1']);

    const renderResult = testHook(useTemplateDisablement)('test-ns', mockFetcher);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: ['disabled-runtime-1'],
        loaded: true,
      }),
    );
    expect(mockFetcher).toHaveBeenCalledWith('test-ns');
  });

  it('should error when namespace is undefined', async () => {
    const renderResult = testHook(useTemplateDisablement)(undefined, mockFetcher);

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
