import { testHook } from '@odh-dashboard/jest-config/hooks';
import useFetch from '@odh-dashboard/internal/utilities/useFetch';
import { mockRayJobK8sResource } from '../../__mocks__/mockRayJobK8sResource';
import { mockRayClusterK8sResource } from '../../__mocks__/mockRayClusterK8sResource';
import { useRayClusterSpec } from '../useRayClusterSpec';

jest.mock('@odh-dashboard/internal/utilities/useFetch', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../api/rayClusters', () => ({
  getRayCluster: jest.fn(),
}));

const useFetchMock = jest.mocked(useFetch);

describe('useRayClusterSpec', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return inline spec for lifecycled RayJobs without fetching', () => {
    useFetchMock.mockReturnValue({
      data: null,
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const job = mockRayJobK8sResource({ name: 'lifecycled-job', rayVersion: '2.9.0' });
    const renderResult = testHook(useRayClusterSpec)(job);

    expect(renderResult.result.current.clusterSpec).toBeDefined();
    expect(renderResult.result.current.clusterSpec?.rayVersion).toBe('2.9.0');
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
  });

  it('should return fetched spec for workspace RayJobs', () => {
    const mockCluster = mockRayClusterK8sResource({
      name: 'shared-cluster',
      namespace: 'test-ns',
      rayVersion: '2.40.0',
      workerReplicas: 2,
    });

    useFetchMock.mockReturnValue({
      data: mockCluster,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    });

    const job = mockRayJobK8sResource({
      name: 'workspace-job',
      namespace: 'test-ns',
      clusterSelector: { 'ray.io/cluster': 'shared-cluster' },
    });

    const renderResult = testHook(useRayClusterSpec)(job);

    expect(renderResult.result.current.clusterSpec?.rayVersion).toBe('2.40.0');
    expect(renderResult.result.current.clusterSpec?.workerGroupSpecs).toHaveLength(1);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
  });

  it('should return loading state for workspace RayJobs while fetching', () => {
    useFetchMock.mockReturnValue({
      data: null,
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const job = mockRayJobK8sResource({
      name: 'workspace-job',
      namespace: 'test-ns',
      clusterSelector: { 'ray.io/cluster': 'shared-cluster' },
    });

    const renderResult = testHook(useRayClusterSpec)(job);

    expect(renderResult.result.current.clusterSpec).toBeUndefined();
    expect(renderResult.result.current.loaded).toBe(false);
  });

  it('should handle fetch errors', () => {
    const mockError = new Error('Failed to fetch RayCluster');

    useFetchMock.mockReturnValue({
      data: null,
      loaded: false,
      error: mockError,
      refresh: jest.fn(),
    });

    const job = mockRayJobK8sResource({
      name: 'workspace-job',
      namespace: 'test-ns',
      clusterSelector: { 'ray.io/cluster': 'missing-cluster' },
    });

    const renderResult = testHook(useRayClusterSpec)(job);

    expect(renderResult.result.current.clusterSpec).toBeUndefined();
    expect(renderResult.result.current.error).toBe(mockError);
  });

  it('should return loaded true when no clusterSelector and no inline spec', () => {
    useFetchMock.mockReturnValue({
      data: null,
      loaded: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const job = mockRayJobK8sResource({ name: 'no-selector-job' });
    const renderResult = testHook(useRayClusterSpec)(job);

    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.clusterSpec).toBeDefined();
  });
});
