/**
 * @jest-environment jsdom
 */
import { testHook } from '@odh-dashboard/jest-config/hooks';
import useFetch from '@odh-dashboard/internal/utilities/useFetch';
import { mockLocalQueueK8sResource } from '@odh-dashboard/internal/__mocks__/mockLocalQueueK8sResource';
import useClusterQueueFromLocalQueue from '../useClusterQueueFromLocalQueue';

jest.mock('@odh-dashboard/internal/utilities/useFetch', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/api/k8s/localQueues', () => ({
  getLocalQueue: jest.fn(),
}));

const useFetchMock = jest.mocked(useFetch);

describe('useClusterQueueFromLocalQueue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null cluster queue name when parameters are missing', () => {
    useFetchMock.mockReturnValue({
      data: null,
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useClusterQueueFromLocalQueue)();

    expect(renderResult.result.current).toStrictEqual({
      clusterQueueName: null,
      loaded: false,
      error: undefined,
    });
  });

  it('should return null cluster queue name when only namespace is provided', () => {
    useFetchMock.mockReturnValue({
      data: null,
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useClusterQueueFromLocalQueue)(undefined, 'test-project');

    expect(renderResult.result.current).toStrictEqual({
      clusterQueueName: null,
      loaded: false,
      error: undefined,
    });
  });

  it('should return null cluster queue name when only local queue name is provided', () => {
    useFetchMock.mockReturnValue({
      data: null,
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useClusterQueueFromLocalQueue)('test-queue', undefined);

    expect(renderResult.result.current).toStrictEqual({
      clusterQueueName: null,
      loaded: false,
      error: undefined,
    });
  });

  it('should return cluster queue name when local queue is found', () => {
    const mockLocalQueue = mockLocalQueueK8sResource({
      name: 'test-queue',
      namespace: 'test-project',
    });

    useFetchMock.mockReturnValue({
      data: mockLocalQueue,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useClusterQueueFromLocalQueue)('test-queue', 'test-project');

    expect(renderResult.result.current).toStrictEqual({
      clusterQueueName: 'test-cluster-queue',
      loaded: true,
      error: undefined,
    });
  });

  it('should return null when local queue is not found', () => {
    useFetchMock.mockReturnValue({
      data: null,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useClusterQueueFromLocalQueue)(
      'non-existent-queue',
      'test-project',
    );

    expect(renderResult.result.current).toStrictEqual({
      clusterQueueName: null,
      loaded: true,
      error: undefined,
    });
  });

  it('should return null when local queue data is null', () => {
    useFetchMock.mockReturnValue({
      data: null,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useClusterQueueFromLocalQueue)('test-queue', 'test-project');

    expect(renderResult.result.current).toStrictEqual({
      clusterQueueName: null,
      loaded: true,
      error: undefined,
    });
  });

  it('should handle errors from useFetch', () => {
    const mockError = new Error('Failed to fetch local queue');

    useFetchMock.mockReturnValue({
      data: null,
      loaded: false,
      error: mockError,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useClusterQueueFromLocalQueue)('test-queue', 'test-project');

    expect(renderResult.result.current).toStrictEqual({
      clusterQueueName: null,
      loaded: false,
      error: mockError,
    });
  });

  it('should return null cluster queue name when data is not loaded yet', () => {
    useFetchMock.mockReturnValue({
      data: null,
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useClusterQueueFromLocalQueue)('test-queue', 'test-project');

    expect(renderResult.result.current).toStrictEqual({
      clusterQueueName: null,
      loaded: false,
      error: undefined,
    });
  });

  it('should call useFetch when both parameters are provided', () => {
    useFetchMock.mockReturnValue({
      data: null,
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    testHook(useClusterQueueFromLocalQueue)('test-queue', 'test-project');

    // Verify useFetch was called with correct parameters
    expect(useFetchMock).toHaveBeenCalledWith(expect.any(Function), null, {
      initialPromisePurity: true,
    });
    expect(useFetchMock).toHaveBeenCalledTimes(1);
  });

  it('should update cluster queue name when parameters change', () => {
    const mockLocalQueue1 = mockLocalQueueK8sResource({
      name: 'queue-1',
      namespace: 'test-project',
    });
    const mockLocalQueue2 = mockLocalQueueK8sResource({
      name: 'queue-2',
      namespace: 'test-project',
    });

    // Initial render with first queue
    useFetchMock.mockReturnValue({
      data: mockLocalQueue1,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useClusterQueueFromLocalQueue)('queue-1', 'test-project');

    expect(renderResult.result.current.clusterQueueName).toBe('test-cluster-queue');

    // Re-render with different queue
    useFetchMock.mockReturnValue({
      data: mockLocalQueue2,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    renderResult.rerender('queue-2', 'test-project');

    expect(renderResult.result.current.clusterQueueName).toBe('test-cluster-queue');
  });

  it('should handle local queue without cluster queue in spec', () => {
    const mockLocalQueueWithoutClusterQueue = {
      ...mockLocalQueueK8sResource({ name: 'test-queue', namespace: 'test-project' }),
      spec: {
        clusterQueue: undefined as unknown as string,
      },
    };

    useFetchMock.mockReturnValue({
      data: mockLocalQueueWithoutClusterQueue,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const renderResult = testHook(useClusterQueueFromLocalQueue)('test-queue', 'test-project');

    expect(renderResult.result.current).toStrictEqual({
      clusterQueueName: undefined,
      loaded: true,
      error: undefined,
    });
  });
});
