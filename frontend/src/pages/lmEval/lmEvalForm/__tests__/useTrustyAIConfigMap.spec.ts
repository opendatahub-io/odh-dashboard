import { act } from 'react';
import { getConfigMap } from '~/api';
import { mockConfigMap } from '~/__mocks__/mockConfigMap';
import { standardUseFetchStateObject, testHook } from '~/__tests__/unit/testUtils/hooks';
import { useLMDashboardNamespace } from '~/pages/lmEval/utilities/useLMDashboardNamespace';
import useTrustyAIConfigMap from '~/pages/lmEval/lmEvalForm/useTrustyAIConfigMap';

// Mock the dependencies
jest.mock('~/api', () => ({
  getConfigMap: jest.fn(),
}));

jest.mock('~/pages/lmEval/utilities/useLMDashboardNamespace', () => ({
  useLMDashboardNamespace: jest.fn(),
}));

const mockGetConfigMap = jest.mocked(getConfigMap);
const mockUseLMDashboardNamespace = jest.mocked(useLMDashboardNamespace);

describe('useTrustyAIConfigMap', () => {
  const mockNamespace = 'test-namespace';
  const mockConfigMapData = mockConfigMap({
    namespace: mockNamespace,
    name: 'trustyai-service-operator-config',
    data: { key: 'value' },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLMDashboardNamespace.mockReturnValue({ dashboardNamespace: mockNamespace });
  });

  it('should fetch config map successfully', async () => {
    mockGetConfigMap.mockResolvedValue(mockConfigMapData);

    const renderResult = testHook(useTrustyAIConfigMap)();

    // Initial state
    expect(renderResult).hookToStrictEqual(standardUseFetchStateObject({ data: null }));
    expect(renderResult).hookToHaveUpdateCount(1);

    // Wait for the fetch to complete
    await renderResult.waitForNextUpdate();

    // Verify the final state
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: mockConfigMapData, loaded: true }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);

    // Verify the API call
    expect(mockGetConfigMap).toHaveBeenCalledTimes(1);
  });

  it('should handle fetch error', async () => {
    const error = new Error('Failed to fetch config map');
    mockGetConfigMap.mockRejectedValue(error);

    const renderResult = testHook(useTrustyAIConfigMap)();

    // Initial state
    expect(renderResult).hookToStrictEqual(standardUseFetchStateObject({ data: null }));
    expect(renderResult).hookToHaveUpdateCount(1);

    // Wait for the fetch to complete
    await renderResult.waitForNextUpdate();

    // Verify the error state
    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: null,
        loaded: false,
        error,
      }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    // Verify the API call
    expect(mockGetConfigMap).toHaveBeenCalledTimes(1);
  });

  it('should refresh when refresh is called', async () => {
    mockGetConfigMap.mockResolvedValue(mockConfigMapData);

    const renderResult = testHook(useTrustyAIConfigMap)();

    // Wait for initial fetch
    await renderResult.waitForNextUpdate();

    // Call refresh
    await act(() => renderResult.result.current.refresh());

    // Verify the API was called twice
    expect(mockGetConfigMap).toHaveBeenCalledTimes(2);
  });
});
