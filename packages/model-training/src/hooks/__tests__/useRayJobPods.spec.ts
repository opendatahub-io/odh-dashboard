import { testHook } from '@odh-dashboard/jest-config/hooks';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { mockRayJobK8sResource } from '../../__mocks__/mockRayJobK8sResource';
import useRayJobPods from '../useRayJobPods';

jest.mock('@odh-dashboard/internal/utilities/useK8sWatchResourceList', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const useK8sWatchMock = jest.mocked(useK8sWatchResourceList);

const makePod = (name: string, labels: Record<string, string> = {}) => ({
  apiVersion: 'v1',
  kind: 'Pod',
  metadata: { name, namespace: 'test-ns', labels },
  spec: { containers: [{ name: 'main' }] },
  status: { phase: 'Running' },
});

describe('useRayJobPods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty arrays when no pods are found', () => {
    useK8sWatchMock.mockReturnValue([[], true, undefined]);

    const job = mockRayJobK8sResource({ name: 'test-job', namespace: 'test-ns' });
    const renderResult = testHook(useRayJobPods)(job);

    expect(renderResult.result.current.submitterPods).toHaveLength(0);
    expect(renderResult.result.current.headPods).toHaveLength(0);
    expect(renderResult.result.current.workerPods).toHaveLength(0);
    expect(renderResult.result.current.loaded).toBe(true);
  });

  it('should separate head and worker pods from cluster pods', () => {
    const headPod = makePod('head-pod', { 'ray.io/node-type': 'head', 'ray.io/cluster': 'test' });
    const workerPod = makePod('worker-pod', {
      'ray.io/node-type': 'worker',
      'ray.io/cluster': 'test',
    });

    useK8sWatchMock
      .mockReturnValueOnce([[], true, undefined])
      .mockReturnValueOnce([[headPod, workerPod], true, undefined]);

    const job = mockRayJobK8sResource({ name: 'test-job', namespace: 'test-ns' });
    const renderResult = testHook(useRayJobPods)(job);

    expect(renderResult.result.current.headPods).toHaveLength(1);
    expect(renderResult.result.current.workerPods).toHaveLength(1);
    expect(renderResult.result.current.headPods[0].metadata.name).toBe('head-pod');
    expect(renderResult.result.current.workerPods[0].metadata.name).toBe('worker-pod');
  });

  it('should return not loaded when either watch is loading', () => {
    useK8sWatchMock
      .mockReturnValueOnce([[], false, undefined])
      .mockReturnValueOnce([[], true, undefined]);

    const job = mockRayJobK8sResource({ name: 'test-job', namespace: 'test-ns' });
    const renderResult = testHook(useRayJobPods)(job);

    expect(renderResult.result.current.loaded).toBe(false);
  });

  it('should return undefined when job is undefined', () => {
    useK8sWatchMock.mockReturnValue([[], false, undefined]);

    const renderResult = testHook(useRayJobPods)(undefined);

    expect(renderResult.result.current.submitterPods).toHaveLength(0);
    expect(renderResult.result.current.headPods).toHaveLength(0);
    expect(renderResult.result.current.workerPods).toHaveLength(0);
  });
});
