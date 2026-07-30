import { renderHook, waitFor } from '@testing-library/react';
import { PodKind } from '@odh-dashboard/k8s-core';
import { getPodContainerLogText } from '@odh-dashboard/internal/api/k8s/pods';
import { FeatureStoreKind } from '../../k8sTypes';
import { getFeatureStore, getPodsForFeatureStore } from '../../api/featureStores';
import useWatchFeatureStoreDeployment, {
  isTerminal,
  isTransientLogError,
  transientLogMessage,
  resolvePhase,
  DeploymentPhase,
} from '../useWatchFeatureStoreDeployment';

jest.mock('../../api/featureStores', () => ({
  getFeatureStore: jest.fn(),
  getPodsForFeatureStore: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/api/k8s/pods', () => ({
  getPodContainerLogText: jest.fn(),
}));

jest.mock('@odh-dashboard/ui-core/hooks/useFetch', () => {
  const actual = jest.requireActual('@odh-dashboard/ui-core/hooks/useFetch');
  return actual;
});

const getFeatureStoreMock = jest.mocked(getFeatureStore);
const getPodsForFeatureStoreMock = jest.mocked(getPodsForFeatureStore);
const getPodContainerLogTextMock = jest.mocked(getPodContainerLogText);

const makeFS = (phase?: string): FeatureStoreKind =>
  ({
    apiVersion: 'feast.dev/v1',
    kind: 'FeatureStore',
    metadata: { name: 'test', namespace: 'ns' },
    spec: { feastProject: 'proj' },
    ...(phase !== undefined ? { status: { phase } } : {}),
  } as FeatureStoreKind);

const makePod = (name: string, containers: string[], initContainers?: string[]): PodKind =>
  ({
    metadata: { name },
    spec: {
      containers: containers.map((c) => ({ name: c })),
      initContainers: initContainers?.map((c) => ({ name: c })),
    },
  } as unknown as PodKind);

describe('resolvePhase', () => {
  it('returns Pending when FeatureStore is null', () => {
    expect(resolvePhase(null)).toBe('Pending');
  });

  it('returns Pending when status is undefined', () => {
    expect(resolvePhase(makeFS())).toBe('Pending');
  });

  it('returns Pending when status.phase is an empty string', () => {
    expect(resolvePhase(makeFS(''))).toBe('Pending');
  });

  it('returns Pending for explicit "Pending" phase', () => {
    expect(resolvePhase(makeFS('Pending'))).toBe('Pending');
  });

  it('returns Ready for "Ready" phase', () => {
    expect(resolvePhase(makeFS('Ready'))).toBe('Ready');
  });

  it('returns Failed for "Failed" phase', () => {
    expect(resolvePhase(makeFS('Failed'))).toBe('Failed');
  });

  it('returns Installing for "Installing" phase', () => {
    expect(resolvePhase(makeFS('Installing'))).toBe('Installing');
  });

  it('returns Installing for "Provisioning" phase', () => {
    expect(resolvePhase(makeFS('Provisioning'))).toBe('Installing');
  });

  it('returns Unknown for unrecognized phase strings', () => {
    expect(resolvePhase(makeFS('SomethingElse'))).toBe('Unknown');
  });
});

describe('isTerminal', () => {
  it.each<[DeploymentPhase, boolean]>([
    ['Ready', true],
    ['Failed', true],
    ['Pending', false],
    ['Installing', false],
    ['Unknown', false],
  ])('returns %s for phase "%s"', (phase, expected) => {
    expect(isTerminal(phase)).toBe(expected);
  });
});

describe('isTransientLogError', () => {
  it('returns true for ContainerCreating errors', () => {
    expect(isTransientLogError(new Error('ContainerCreating'))).toBe(true);
  });

  it('returns true for PodInitializing errors', () => {
    expect(isTransientLogError(new Error('PodInitializing'))).toBe(true);
  });

  it('returns true for standalone 400 status code', () => {
    expect(isTransientLogError(new Error('request failed with status 400'))).toBe(true);
  });

  it('returns false for port 8400 (word-boundary check)', () => {
    expect(isTransientLogError(new Error('port 8400 in use'))).toBe(false);
  });

  it('returns false for http://svc:8400 (word-boundary check)', () => {
    expect(isTransientLogError(new Error('connect to http://svc:8400'))).toBe(false);
  });

  it('returns false for RBAC/auth errors', () => {
    expect(isTransientLogError(new Error('forbidden: User cannot get pods/log'))).toBe(false);
  });

  it('returns false for connection errors', () => {
    expect(isTransientLogError(new Error('connection refused'))).toBe(false);
  });

  it('handles non-Error thrown values', () => {
    expect(isTransientLogError('ContainerCreating')).toBe(true);
    expect(isTransientLogError('some other error')).toBe(false);
  });
});

describe('transientLogMessage', () => {
  it('returns init-container waiting message when isInit is true', () => {
    expect(transientLogMessage(true)).toBe('(waiting for init container to start...)');
  });

  it('returns container waiting message when isInit is false', () => {
    expect(transientLogMessage(false)).toBe('(waiting for container to start...)');
  });
});

describe('useWatchFeatureStoreDeployment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return initial pending state when namespace/name are empty', () => {
    const { result } = renderHook(() => useWatchFeatureStoreDeployment('', ''));

    expect(result.current.featureStore).toBeNull();
    expect(result.current.phase).toBe('Pending');
    expect(result.current.pods).toEqual([]);
    expect(result.current.isComplete).toBe(false);
    expect(result.current.isFailed).toBe(false);
  });

  it('should fetch deployment and resolve phase', async () => {
    const fs = makeFS('Installing');
    getFeatureStoreMock.mockResolvedValue(fs);
    getPodsForFeatureStoreMock.mockResolvedValue([]);

    const { result } = renderHook(() => useWatchFeatureStoreDeployment('ns', 'test'));

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.featureStore).toEqual(fs);
    expect(result.current.phase).toBe('Installing');
    expect(result.current.isComplete).toBe(false);
    expect(result.current.isFailed).toBe(false);
    expect(getFeatureStoreMock).toHaveBeenCalledWith('ns', 'test');
    expect(getPodsForFeatureStoreMock).toHaveBeenCalledWith('ns', 'test');
  });

  it('should set isComplete when phase is Ready', async () => {
    getFeatureStoreMock.mockResolvedValue(makeFS('Ready'));
    getPodsForFeatureStoreMock.mockResolvedValue([]);

    const { result } = renderHook(() => useWatchFeatureStoreDeployment('ns', 'test'));

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.isComplete).toBe(true);
    expect(result.current.isFailed).toBe(false);
  });

  it('should set isFailed when phase is Failed', async () => {
    getFeatureStoreMock.mockResolvedValue(makeFS('Failed'));
    getPodsForFeatureStoreMock.mockResolvedValue([]);

    const { result } = renderHook(() => useWatchFeatureStoreDeployment('ns', 'test'));

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.isComplete).toBe(false);
    expect(result.current.isFailed).toBe(true);
  });

  it('should extract conditions from feature store status', async () => {
    const fs = {
      ...makeFS('Installing'),
      status: {
        phase: 'Installing',
        conditions: [{ type: 'Available', status: 'True' }],
      },
    } as FeatureStoreKind;
    getFeatureStoreMock.mockResolvedValue(fs);
    getPodsForFeatureStoreMock.mockResolvedValue([]);

    const { result } = renderHook(() => useWatchFeatureStoreDeployment('ns', 'test'));

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.conditions).toEqual([{ type: 'Available', status: 'True' }]);
  });

  it('should return empty conditions when status has none', async () => {
    getFeatureStoreMock.mockResolvedValue(makeFS('Installing'));
    getPodsForFeatureStoreMock.mockResolvedValue([]);

    const { result } = renderHook(() => useWatchFeatureStoreDeployment('ns', 'test'));

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    expect(result.current.conditions).toEqual([]);
  });

  it('should set error on API failure', async () => {
    getFeatureStoreMock.mockRejectedValue(new Error('not found'));
    getPodsForFeatureStoreMock.mockRejectedValue(new Error('not found'));

    const { result } = renderHook(() => useWatchFeatureStoreDeployment('ns', 'test'));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.error?.message).toBe('not found');
  });

  it('should fetch pod logs when pods are available', async () => {
    const pod = makePod('pod-1', ['main']);
    getFeatureStoreMock.mockResolvedValue(makeFS('Installing'));
    getPodsForFeatureStoreMock.mockResolvedValue([pod]);
    getPodContainerLogTextMock.mockResolvedValue('log line 1\nlog line 2');

    const { result } = renderHook(() => useWatchFeatureStoreDeployment('ns', 'test'));

    await waitFor(() => {
      expect(result.current.loaded).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.podLogs.data).toEqual({ 'pod-1/main': 'log line 1\nlog line 2' });
    });

    expect(getPodContainerLogTextMock).toHaveBeenCalledWith('ns', 'pod-1', 'main', 200);
  });

  it('should fetch logs for init containers', async () => {
    const pod = makePod('pod-1', ['main'], ['init-1']);
    getFeatureStoreMock.mockResolvedValue(makeFS('Installing'));
    getPodsForFeatureStoreMock.mockResolvedValue([pod]);
    getPodContainerLogTextMock.mockResolvedValue('init log');

    const { result } = renderHook(() => useWatchFeatureStoreDeployment('ns', 'test'));

    await waitFor(() => {
      expect(result.current.podLogs.data).toHaveProperty('pod-1/init:init-1', 'init log');
    });
  });

  it('should return transient message for ContainerCreating errors on init containers', async () => {
    const pod = makePod('pod-1', ['main'], ['init-1']);
    getFeatureStoreMock.mockResolvedValue(makeFS('Installing'));
    getPodsForFeatureStoreMock.mockResolvedValue([pod]);
    getPodContainerLogTextMock.mockImplementation(async (_ns, _pod, container) => {
      if (container === 'init-1') {
        throw new Error('ContainerCreating');
      }
      return 'main log';
    });

    const { result } = renderHook(() => useWatchFeatureStoreDeployment('ns', 'test'));

    await waitFor(() => {
      expect(result.current.podLogs.data).toHaveProperty(
        'pod-1/init:init-1',
        '(waiting for init container to start...)',
      );
    });
  });

  it('should return transient message for ContainerCreating on regular containers', async () => {
    const pod = makePod('pod-1', ['main']);
    getFeatureStoreMock.mockResolvedValue(makeFS('Installing'));
    getPodsForFeatureStoreMock.mockResolvedValue([pod]);
    getPodContainerLogTextMock.mockRejectedValue(new Error('ContainerCreating'));

    const { result } = renderHook(() => useWatchFeatureStoreDeployment('ns', 'test'));

    await waitFor(() => {
      expect(result.current.podLogs.data).toHaveProperty(
        'pod-1/main',
        '(waiting for container to start...)',
      );
    });
  });

  it('should propagate hard log errors', async () => {
    const pod = makePod('pod-1', ['main']);
    getFeatureStoreMock.mockResolvedValue(makeFS('Installing'));
    getPodsForFeatureStoreMock.mockResolvedValue([pod]);
    getPodContainerLogTextMock.mockRejectedValue(new Error('forbidden: RBAC denied'));

    const { result } = renderHook(() => useWatchFeatureStoreDeployment('ns', 'test'));

    await waitFor(() => {
      expect(result.current.podLogs.error).toBeDefined();
    });

    expect(result.current.podLogs.error?.message).toBe('forbidden: RBAC denied');
  });

  it('should limit log fetches to MAX_LOG_PODS pods', async () => {
    const pods = Array.from({ length: 8 }, (_, i) => makePod(`pod-${i}`, ['main']));
    getFeatureStoreMock.mockResolvedValue(makeFS('Installing'));
    getPodsForFeatureStoreMock.mockResolvedValue(pods);
    getPodContainerLogTextMock.mockResolvedValue('log');

    const { result } = renderHook(() => useWatchFeatureStoreDeployment('ns', 'test'));

    await waitFor(() => {
      expect(result.current.podLogs.loaded).toBe(true);
    });

    expect(getPodContainerLogTextMock).toHaveBeenCalledTimes(5);
  });

  it('should limit total log entries to MAX_LOG_ENTRIES across containers', async () => {
    const manyContainers = Array.from({ length: 10 }, (_, i) => `container-${i}`);
    const pods = [makePod('pod-0', manyContainers), makePod('pod-1', manyContainers)];
    getFeatureStoreMock.mockResolvedValue(makeFS('Installing'));
    getPodsForFeatureStoreMock.mockResolvedValue(pods);
    getPodContainerLogTextMock.mockResolvedValue('log');

    const { result } = renderHook(() => useWatchFeatureStoreDeployment('ns', 'test'));

    await waitFor(() => {
      expect(result.current.podLogs.loaded).toBe(true);
    });

    expect(getPodContainerLogTextMock).toHaveBeenCalledTimes(15);
  });

  it('should propagate hard log errors from init containers', async () => {
    const pod = makePod('pod-1', ['main'], ['init-1']);
    getFeatureStoreMock.mockResolvedValue(makeFS('Installing'));
    getPodsForFeatureStoreMock.mockResolvedValue([pod]);
    getPodContainerLogTextMock.mockImplementation(async (_ns, _pod, container) => {
      if (container === 'init-1') {
        throw new Error('forbidden: init RBAC denied');
      }
      return 'main log';
    });

    const { result } = renderHook(() => useWatchFeatureStoreDeployment('ns', 'test'));

    await waitFor(() => {
      expect(result.current.podLogs.error).toBeDefined();
    });

    expect(result.current.podLogs.error?.message).toBe('forbidden: init RBAC denied');
  });
});
