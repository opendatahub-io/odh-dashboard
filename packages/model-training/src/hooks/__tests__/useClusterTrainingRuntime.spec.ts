import { testHook } from '@odh-dashboard/jest-config/hooks';
import useFetch from '@odh-dashboard/internal/utilities/useFetch';
import { mockClusterTrainingRuntimeK8sResource } from '../../__mocks__/mockClusterTrainingRuntimeK8sResource';
import useClusterTrainingRuntime from '../useClusterTrainingRuntime';

jest.mock('@odh-dashboard/internal/utilities/useFetch', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../api', () => ({
  getClusterTrainingRuntime: jest.fn(),
}));

const useFetchMock = jest.mocked(useFetch);

describe('useClusterTrainingRuntime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when runtime name is not provided', () => {
    useFetchMock.mockReturnValue({
      data: null,
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useClusterTrainingRuntime)();

    expect(renderResult.result.current).toStrictEqual({
      clusterTrainingRuntime: null,
      loaded: false,
      error: undefined,
    });
  });

  it('should return null when runtime name is null', () => {
    useFetchMock.mockReturnValue({
      data: null,
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useClusterTrainingRuntime)(null);

    expect(renderResult.result.current).toStrictEqual({
      clusterTrainingRuntime: null,
      loaded: false,
      error: undefined,
    });
  });

  it('should return ClusterTrainingRuntime when found', () => {
    const mockRuntime = mockClusterTrainingRuntimeK8sResource({
      name: 'training-cuda128-torch28-py312',
      numNodes: 2,
    });

    useFetchMock.mockReturnValue({
      data: mockRuntime,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useClusterTrainingRuntime)('training-cuda128-torch28-py312');

    expect(renderResult.result.current).toStrictEqual({
      clusterTrainingRuntime: mockRuntime,
      loaded: true,
      error: undefined,
    });
    expect(renderResult.result.current.clusterTrainingRuntime?.spec.mlPolicy?.numNodes).toBe(2);
  });

  it('should return null when ClusterTrainingRuntime is not found', () => {
    useFetchMock.mockReturnValue({
      data: null,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useClusterTrainingRuntime)('non-existent-runtime');

    expect(renderResult.result.current).toStrictEqual({
      clusterTrainingRuntime: null,
      loaded: true,
      error: undefined,
    });
  });

  it('should handle errors from useFetch', () => {
    const mockError = new Error('Failed to fetch ClusterTrainingRuntime');

    useFetchMock.mockReturnValue({
      data: null,
      loaded: false,
      error: mockError,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useClusterTrainingRuntime)('training-cuda128-torch28-py312');

    expect(renderResult.result.current).toStrictEqual({
      clusterTrainingRuntime: null,
      loaded: false,
      error: mockError,
    });
  });

  it('should return null when data is not loaded yet', () => {
    useFetchMock.mockReturnValue({
      data: null,
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useClusterTrainingRuntime)('training-cuda128-torch28-py312');

    expect(renderResult.result.current).toStrictEqual({
      clusterTrainingRuntime: null,
      loaded: false,
      error: undefined,
    });
  });

  it('should call useFetch when runtime name is provided', () => {
    useFetchMock.mockReturnValue({
      data: null,
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    testHook(useClusterTrainingRuntime)('training-cuda128-torch28-py312');

    // Verify useFetch was called with correct parameters
    expect(useFetchMock).toHaveBeenCalledWith(expect.any(Function), null, {
      initialPromisePurity: true,
    });
    expect(useFetchMock).toHaveBeenCalledTimes(1);
  });

  it('should update ClusterTrainingRuntime when runtime name changes', () => {
    const mockRuntime1 = mockClusterTrainingRuntimeK8sResource({
      name: 'runtime-1',
      numNodes: 1,
    });
    const mockRuntime2 = mockClusterTrainingRuntimeK8sResource({
      name: 'runtime-2',
      numNodes: 3,
    });

    // Initial render with first runtime
    useFetchMock.mockReturnValue({
      data: mockRuntime1,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useClusterTrainingRuntime)('runtime-1');

    expect(renderResult.result.current.clusterTrainingRuntime?.metadata.name).toBe('runtime-1');
    expect(renderResult.result.current.clusterTrainingRuntime?.spec.mlPolicy?.numNodes).toBe(1);

    // Re-render with different runtime
    useFetchMock.mockReturnValue({
      data: mockRuntime2,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    renderResult.rerender('runtime-2');

    expect(renderResult.result.current.clusterTrainingRuntime?.metadata.name).toBe('runtime-2');
    expect(renderResult.result.current.clusterTrainingRuntime?.spec.mlPolicy?.numNodes).toBe(3);
  });
});
