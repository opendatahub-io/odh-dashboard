import { testHook, standardUseFetchStateObject } from '@odh-dashboard/jest-config/hooks';
import { useIsAreaAvailable } from '@odh-dashboard/plugin-core/areas';
import type { IsAreaAvailableStatus } from '@odh-dashboard/plugin-core/areas';
import useServingRuntimeConfigList from '../useServingRuntimeConfigList';

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

describe('useServingRuntimeConfigList', () => {
  const mockFetcher = jest.fn<Promise<string[]>, [string]>();
  const errorMessage = 'Config is not configured.';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsAreaAvailable.mockReturnValue(mockAreaStatus(true));
  });

  it('should return default state initially', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    mockFetcher.mockReturnValue(new Promise(() => {}));

    const renderResult = testHook(useServingRuntimeConfigList)(
      'test-ns',
      mockFetcher,
      errorMessage,
    );

    expect(renderResult).hookToStrictEqual(standardUseFetchStateObject({ data: [] }));
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should fetch and return data on success', async () => {
    mockFetcher.mockResolvedValue(['template-a', 'template-b']);

    const renderResult = testHook(useServingRuntimeConfigList)(
      'test-ns',
      mockFetcher,
      errorMessage,
    );

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: ['template-a', 'template-b'],
        loaded: true,
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockFetcher).toHaveBeenCalledWith('test-ns');
  });

  it('should error when namespace is undefined', async () => {
    const renderResult = testHook(useServingRuntimeConfigList)(
      undefined,
      mockFetcher,
      errorMessage,
    );

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: [],
        error: new Error('No namespace provided'),
      }),
    );
    expect(mockFetcher).not.toHaveBeenCalled();
  });

  it('should stay suspended when custom serving runtimes are disabled', () => {
    mockUseIsAreaAvailable.mockReturnValue(mockAreaStatus(false));

    const renderResult = testHook(useServingRuntimeConfigList)(
      'test-ns',
      mockFetcher,
      errorMessage,
    );

    expect(renderResult).hookToStrictEqual(standardUseFetchStateObject({ data: [] }));
    expect(renderResult).hookToHaveUpdateCount(1);
    expect(mockFetcher).not.toHaveBeenCalled();
  });

  it('should translate 404 errors to the provided error message', async () => {
    const notFoundError = Object.assign(new Error('not found'), {
      statusObject: { code: 404 },
    });
    mockFetcher.mockRejectedValue(notFoundError);

    const renderResult = testHook(useServingRuntimeConfigList)(
      'test-ns',
      mockFetcher,
      errorMessage,
    );

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: [],
        error: new Error(errorMessage),
      }),
    );
  });

  it('should propagate non-404 errors as-is', async () => {
    const serverError = new Error('Internal server error');
    mockFetcher.mockRejectedValue(serverError);

    const renderResult = testHook(useServingRuntimeConfigList)(
      'test-ns',
      mockFetcher,
      errorMessage,
    );

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: [],
        error: serverError,
      }),
    );
  });
});
