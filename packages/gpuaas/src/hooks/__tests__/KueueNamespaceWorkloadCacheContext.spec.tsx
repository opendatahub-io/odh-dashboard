import * as React from 'react';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import type { PodKind, WorkloadKind } from '@odh-dashboard/k8s-core';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { useProjects } from '@odh-dashboard/internal/api/k8s/projects';
import { listHardwareProfiles } from '@odh-dashboard/internal/api/k8s/hardwareProfiles';
import KueueNamespaceWorkloadCacheProvider, {
  useKueueNamespaceWorkloadCache,
} from '../KueueNamespaceWorkloadCacheContext';
import { TREND_REFRESH_INTERVAL } from '../../const';
import {
  enrichNamespaceWorkloadData,
  fetchLocalQueueClusterQueueIndex,
  fetchNamespaceWorkloadBaseData,
  toNamespaceWorkloadData,
  type NamespaceWorkloadData,
} from '../../utils/clusterQueueWorkloads';

jest.mock('@odh-dashboard/internal/api/k8s/projects', () => ({
  useProjects: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/api/k8s/hardwareProfiles', () => ({
  listHardwareProfiles: jest.fn(),
  getHardwareProfile: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/redux/selectors/project', () => ({
  useDashboardNamespace: jest.fn(() => ({ dashboardNamespace: 'redhat-ods-applications' })),
}));

jest.mock('../../utils/clusterQueueWorkloads', () => ({
  ...jest.requireActual('../../utils/clusterQueueWorkloads'),
  fetchLocalQueueClusterQueueIndex: jest.fn(),
  fetchNamespaceWorkloadBaseData: jest.fn(),
  enrichNamespaceWorkloadData: jest.fn(),
}));

const useProjectsMock = jest.mocked(useProjects);
const listHardwareProfilesMock = jest.mocked(listHardwareProfiles);
const fetchLocalQueueClusterQueueIndexMock = jest.mocked(fetchLocalQueueClusterQueueIndex);
const fetchNamespaceWorkloadBaseDataMock = jest.mocked(fetchNamespaceWorkloadBaseData);
const enrichNamespaceWorkloadDataMock = jest.mocked(enrichNamespaceWorkloadData);

const dsp1 = mockProjectK8sResource({ k8sName: 'dsp-1', enableKueue: true });
const dsp2 = mockProjectK8sResource({ k8sName: 'dsp-2', enableKueue: true });

const base = (namespace: string) => ({
  namespace,
  workloads: [],
  localQueues: [],
});

const baseWithWorkload = (namespace: string, uid: string) => ({
  ...base(namespace),
  workloads: [
    {
      apiVersion: 'kueue.x-k8s.io/v1beta2',
      kind: 'Workload',
      metadata: { name: `workload-${uid}`, namespace, uid },
      spec: { queueName: 'queue', podSets: [] },
    } satisfies WorkloadKind,
  ],
});

const mockPod = (name: string): PodKind => ({
  apiVersion: 'v1',
  kind: 'Pod',
  metadata: { name },
  spec: { containers: [{ name: 'main', image: 'test-image', env: [] }] },
});

const bundle = (namespace: string, podName?: string): NamespaceWorkloadData => ({
  ...base(namespace),
  pods: podName ? [mockPod(podName)] : [],
  statefulSets: [],
  inferenceServices: [],
  jobKindByUid: new Map(),
});

describe('KueueNamespaceWorkloadCacheProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useProjectsMock.mockReturnValue([[dsp1, dsp2], true, undefined]);
    listHardwareProfilesMock.mockResolvedValue([]);
    fetchLocalQueueClusterQueueIndexMock.mockResolvedValue(
      new Map([
        ['gpu-cq', new Set(['dsp-1'])],
        ['other-cq', new Set(['dsp-2'])],
      ]),
    );
    fetchNamespaceWorkloadBaseDataMock.mockImplementation((namespace: string) =>
      Promise.resolve(base(namespace)),
    );
    enrichNamespaceWorkloadDataMock.mockImplementation((baseData) =>
      Promise.resolve(bundle(baseData.namespace)),
    );
  });

  const renderWithProvider = (clusterQueueNames: string[]) =>
    renderHook(() => useKueueNamespaceWorkloadCache(), {
      wrapper: ({ children }) => (
        <KueueNamespaceWorkloadCacheProvider clusterQueueNames={clusterQueueNames}>
          {children}
        </KueueNamespaceWorkloadCacheProvider>
      ),
    });

  it('does not fetch namespace data when no cluster queue is selected', async () => {
    const { result } = renderWithProvider([]);

    await waitFor(() => expect(result.current.loaded).toBe(false));
    expect(fetchLocalQueueClusterQueueIndexMock).not.toHaveBeenCalled();
    expect(fetchNamespaceWorkloadBaseDataMock).not.toHaveBeenCalled();
    expect(enrichNamespaceWorkloadDataMock).not.toHaveBeenCalled();
  });

  it('fetches base namespace data only for namespaces relevant to the selected cluster queue', async () => {
    const { result } = renderWithProvider(['gpu-cq']);

    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(fetchNamespaceWorkloadBaseDataMock).toHaveBeenCalledTimes(1);
    expect(fetchNamespaceWorkloadBaseDataMock).toHaveBeenCalledWith('dsp-1');
    expect(result.current.cache.namespaceData.map((data) => data.namespace)).toEqual(['dsp-1']);
    await waitFor(() => expect(enrichNamespaceWorkloadDataMock).toHaveBeenCalledTimes(1));
    expect(enrichNamespaceWorkloadDataMock).toHaveBeenCalledWith(base('dsp-1'), ['gpu-cq']);
  });

  it('marks loaded only after enrichment completes', async () => {
    let resolveEnrich: ((value: ReturnType<typeof bundle>) => void) | undefined;
    enrichNamespaceWorkloadDataMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveEnrich = resolve;
        }),
    );

    const { result } = renderWithProvider(['gpu-cq']);

    await waitFor(() =>
      expect(result.current.cache.namespaceData).toEqual([toNamespaceWorkloadData(base('dsp-1'))]),
    );
    expect(result.current.loaded).toBe(false);

    await act(async () => {
      resolveEnrich?.(bundle('dsp-1'));
    });

    await waitFor(() => expect(result.current.loaded).toBe(true));
    await waitFor(() => expect(result.current.cache.namespaceData).toEqual([bundle('dsp-1')]));
  });

  it('does not show stale enrichment after switching cluster queues', async () => {
    fetchLocalQueueClusterQueueIndexMock.mockResolvedValue(
      new Map([
        ['gpu-cq', new Set(['dsp-1'])],
        ['other-cq', new Set(['dsp-1', 'dsp-2'])],
      ]),
    );

    const pendingOtherEnrichResolvers: Array<() => void> = [];
    enrichNamespaceWorkloadDataMock.mockImplementation((baseData, clusterQueueNames) => {
      if (clusterQueueNames.includes('other-cq')) {
        return new Promise((resolve) => {
          pendingOtherEnrichResolvers.push(() =>
            resolve(bundle(baseData.namespace, 'other-cq-enriched')),
          );
        });
      }
      return Promise.resolve(bundle(baseData.namespace, 'gpu-cq-enriched'));
    });

    let latestValue: ReturnType<typeof useKueueNamespaceWorkloadCache> | undefined;
    let setClusterQueueNames: React.Dispatch<React.SetStateAction<string[]>> = () => undefined;

    const Harness: React.FC = () => {
      const [clusterQueueNames, setter] = React.useState<string[]>(['gpu-cq']);
      setClusterQueueNames = setter;
      return (
        <KueueNamespaceWorkloadCacheProvider clusterQueueNames={clusterQueueNames}>
          <Consumer />
        </KueueNamespaceWorkloadCacheProvider>
      );
    };
    const Consumer: React.FC = () => {
      latestValue = useKueueNamespaceWorkloadCache();
      return null;
    };

    render(<Harness />);

    await waitFor(() =>
      expect(latestValue?.cache.namespaceData[0]?.pods[0]?.metadata?.name).toBe('gpu-cq-enriched'),
    );

    act(() => setClusterQueueNames(['other-cq']));

    await waitFor(() =>
      expect(latestValue?.cache.namespaceData.map((data) => data.namespace).toSorted()).toEqual([
        'dsp-1',
        'dsp-2',
      ]),
    );
    expect(latestValue?.loaded).toBe(false);
    expect(
      latestValue?.cache.namespaceData.every(
        (data) => data.pods.length === 0 || data.pods[0]?.metadata?.name !== 'gpu-cq-enriched',
      ),
    ).toBe(true);

    await act(async () => {
      pendingOtherEnrichResolvers.splice(0).forEach((resolve) => resolve());
    });

    await waitFor(() =>
      expect(
        latestValue?.cache.namespaceData.some(
          (data) => data.pods[0]?.metadata?.name === 'other-cq-enriched',
        ),
      ).toBe(true),
    );
  });

  it('re-fetches all relevant namespaces when switching cluster queues', async () => {
    fetchLocalQueueClusterQueueIndexMock.mockResolvedValue(
      new Map([
        ['gpu-cq', new Set(['dsp-1'])],
        ['other-cq', new Set(['dsp-1', 'dsp-2'])],
      ]),
    );

    let latestValue: ReturnType<typeof useKueueNamespaceWorkloadCache> | undefined;
    let setClusterQueueNames: React.Dispatch<React.SetStateAction<string[]>> = () => undefined;

    const Harness: React.FC = () => {
      const [clusterQueueNames, setter] = React.useState<string[]>(['gpu-cq']);
      setClusterQueueNames = setter;
      return (
        <KueueNamespaceWorkloadCacheProvider clusterQueueNames={clusterQueueNames}>
          <Consumer />
        </KueueNamespaceWorkloadCacheProvider>
      );
    };
    const Consumer: React.FC = () => {
      latestValue = useKueueNamespaceWorkloadCache();
      return null;
    };

    render(<Harness />);

    await waitFor(() => expect(latestValue?.loaded).toBe(true));
    expect(fetchNamespaceWorkloadBaseDataMock).toHaveBeenCalledTimes(1);
    expect(fetchNamespaceWorkloadBaseDataMock).toHaveBeenCalledWith('dsp-1');

    act(() => setClusterQueueNames(['other-cq']));

    await waitFor(() =>
      expect(latestValue?.cache.namespaceData.map((data) => data.namespace).toSorted()).toEqual([
        'dsp-1',
        'dsp-2',
      ]),
    );
    expect(fetchNamespaceWorkloadBaseDataMock).toHaveBeenCalledTimes(2);
    expect(fetchNamespaceWorkloadBaseDataMock).toHaveBeenCalledWith('dsp-2');
    await waitFor(() => expect(enrichNamespaceWorkloadDataMock).toHaveBeenCalledTimes(3));
  });

  it('keeps workload data loaded when hardware profile listing fails', async () => {
    listHardwareProfilesMock.mockRejectedValue(new Error('hardware profiles forbidden'));

    const { result } = renderWithProvider(['gpu-cq']);

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.error).toBeUndefined();
    expect(enrichNamespaceWorkloadDataMock).toHaveBeenCalled();
  });

  it('surfaces namespace fetch failures while keeping successful namespaces', async () => {
    fetchNamespaceWorkloadBaseDataMock.mockImplementation((namespace: string) => {
      if (namespace === 'dsp-2') {
        return Promise.reject(new Error('forbidden'));
      }
      return Promise.resolve(base(namespace));
    });
    fetchLocalQueueClusterQueueIndexMock.mockResolvedValue(
      new Map([['other-cq', new Set(['dsp-1', 'dsp-2'])]]),
    );

    const { result } = renderWithProvider(['other-cq']);

    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.cache.namespaceData.map((data) => data.namespace)).toEqual(['dsp-1']);
    expect(result.current.error?.message).toContain('dsp-2');
    expect(result.current.error?.message).toContain('forbidden');
  });

  it('periodically refreshes at the trend refresh interval when active', async () => {
    jest.useFakeTimers();
    try {
      const { result } = renderWithProvider(['gpu-cq']);

      await waitFor(() => expect(result.current.loaded).toBe(true));
      expect(fetchNamespaceWorkloadBaseDataMock).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(TREND_REFRESH_INTERVAL);
      });
      await waitFor(() => expect(fetchNamespaceWorkloadBaseDataMock).toHaveBeenCalledTimes(2));
    } finally {
      jest.useRealTimers();
    }
  });

  it('re-fetches namespace bundles on refresh', async () => {
    const { result } = renderWithProvider(['gpu-cq']);

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(fetchNamespaceWorkloadBaseDataMock).toHaveBeenCalledTimes(1);

    let refreshedCache: Awaited<ReturnType<typeof result.current.refresh>>;
    await act(async () => {
      refreshedCache = await result.current.refresh();
    });

    expect(fetchNamespaceWorkloadBaseDataMock).toHaveBeenCalledTimes(2);
    expect(fetchNamespaceWorkloadBaseDataMock).toHaveBeenCalledWith('dsp-1');
    expect(refreshedCache?.namespaceData.map((data) => data.namespace)).toEqual(['dsp-1']);
  });

  it('does not let a superseded base fetch overwrite the latest cache', async () => {
    const refreshResolvers: Array<(value: ReturnType<typeof baseWithWorkload>) => void> = [];
    fetchNamespaceWorkloadBaseDataMock.mockResolvedValueOnce(base('dsp-1')).mockImplementation(
      () =>
        new Promise((resolve) => {
          refreshResolvers.push(resolve);
        }),
    );

    const { result } = renderWithProvider(['gpu-cq']);
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => {
      void result.current.refresh();
    });
    await waitFor(() => expect(refreshResolvers).toHaveLength(1));

    let secondRefresh: Promise<unknown> | undefined;
    act(() => {
      secondRefresh = result.current.refresh();
    });
    await waitFor(() => expect(refreshResolvers).toHaveLength(2));

    await act(async () => {
      refreshResolvers[1]?.(baseWithWorkload('dsp-1', 'fresh'));
      await secondRefresh;
    });
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await act(async () => {
      refreshResolvers[0]?.(baseWithWorkload('dsp-1', 'stale'));
    });

    await waitFor(() =>
      expect(result.current.cache.namespaceData[0]?.workloads[0]?.metadata?.uid).toBe('fresh'),
    );
  });

  it('does not reuse stale enrichment after refresh', async () => {
    enrichNamespaceWorkloadDataMock
      .mockResolvedValueOnce(bundle('dsp-1', 'stale-pod'))
      .mockResolvedValueOnce(bundle('dsp-1', 'fresh-pod'));

    const { result } = renderWithProvider(['gpu-cq']);

    await waitFor(() =>
      expect(result.current.cache.namespaceData[0]?.pods[0]?.metadata?.name).toBe('stale-pod'),
    );

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() =>
      expect(result.current.cache.namespaceData[0]?.pods[0]?.metadata?.name).toBe('fresh-pod'),
    );
    expect(enrichNamespaceWorkloadDataMock).toHaveBeenCalledTimes(2);
  });

  it('drops enrichment instead of preserving stale pods when enrichment fails', async () => {
    enrichNamespaceWorkloadDataMock
      .mockResolvedValueOnce(bundle('dsp-1', 'stale-pod'))
      .mockRejectedValueOnce(new Error('enrichment failed'));

    const { result } = renderWithProvider(['gpu-cq']);

    await waitFor(() =>
      expect(result.current.cache.namespaceData[0]?.pods[0]?.metadata?.name).toBe('stale-pod'),
    );

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.cache.namespaceData[0]?.pods).toEqual([]);
    expect(result.current.error?.message).toContain('enrichment failed');
  });
});
