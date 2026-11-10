import * as React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { KueueWorkloadStatus } from '@odh-dashboard/k8s-core/kueue/types';
import {
  ModelServingDataContext,
  type ModelServingDataServices,
  type PendingDeploymentWorkloads,
} from '@odh-dashboard/model-serving/shared/contexts/ModelServingDataContext';
import { useQueuePositionsForDeployments } from '../useQueuePositionsForDeployments';
import { useKueueStatusForDeployments } from '../useKueueStatusForDeployments';
import { useKueueStatusWithQueuePositions } from '../useKueueStatusWithQueuePositions';

jest.mock('../useKueueStatusForDeployments');
jest.mock('@odh-dashboard/hardware-profiles/shared/kueueUtils', () => ({
  useKueueConfiguration: () => ({ isKueueFeatureEnabled: true, isProjectKueueEnabled: true }),
}));

const createWrapper = (services: ModelServingDataServices): React.FC<React.PropsWithChildren> =>
  function Wrapper({ children }) {
    return (
      <ModelServingDataContext.Provider value={services}>
        {children}
      </ModelServingDataContext.Provider>
    );
  };

const statusMap = {
  'LLMInferenceService/model': {
    status: KueueWorkloadStatus.Queued,
    queueName: 'queue',
    workloadName: 'workload',
  },
};
const summary = (position = 0): PendingDeploymentWorkloads => ({
  items: [{ metadata: { name: 'workload' }, positionInLocalQueue: position }],
});

describe('optional serving queue services', () => {
  it('should return no positions without a host service', () => {
    const { result } = renderHook(() => useQueuePositionsForDeployments('namespace', statusMap));
    expect(result.current).toEqual({});
  });

  it('should abort old requests and discard late results after changing namespaces', async () => {
    const requests: {
      signal?: AbortSignal;
      resolve: (value: PendingDeploymentWorkloads) => void;
    }[] = [];
    const getPendingWorkloads: ModelServingDataServices['getPendingWorkloads'] = (
      _namespace,
      _queue,
      opts,
    ) =>
      new Promise((resolve) => {
        requests.push({ signal: opts?.signal, resolve });
      });
    const { result, rerender, unmount } = renderHook(
      ({ namespace }) => useQueuePositionsForDeployments(namespace, statusMap),
      { initialProps: { namespace: 'first' }, wrapper: createWrapper({ getPendingWorkloads }) },
    );
    rerender({ namespace: 'second' });
    expect(requests[0].signal?.aborted).toBe(true);
    expect(result.current).toEqual({});
    await act(async () => requests[1].resolve(summary(1)));
    expect(result.current).toEqual({
      'LLMInferenceService/model': { queuePosition: 2, queueTotal: 1 },
    });
    await act(async () => requests[0].resolve(summary(8)));
    expect(result.current).toEqual({
      'LLMInferenceService/model': { queuePosition: 2, queueTotal: 1 },
    });
    unmount();
    expect(requests[1].signal?.aborted).toBe(true);
  });

  it('should immediately drop metrics when the namespace is removed', async () => {
    const getPendingWorkloads = jest.fn(async () => summary());
    const { result, rerender } = renderHook(
      ({ namespace }) => useQueuePositionsForDeployments(namespace, statusMap),
      {
        initialProps: { namespace: 'first' as string | undefined },
        wrapper: createWrapper({ getPendingWorkloads }),
      },
    );
    await waitFor(() => expect(result.current).toHaveProperty('LLMInferenceService/model'));
    rerender({ namespace: undefined });
    expect(result.current).toEqual({});
  });

  it('should immediately drop metrics when the host removes the optional service', async () => {
    const getPendingWorkloads = jest.fn(async () => summary());
    let services: ModelServingDataServices = { getPendingWorkloads };
    const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
      <ModelServingDataContext.Provider value={services}>
        {children}
      </ModelServingDataContext.Provider>
    );
    const { result, rerender } = renderHook(
      () => useQueuePositionsForDeployments('namespace', statusMap),
      { wrapper },
    );
    await waitFor(() => expect(result.current).toHaveProperty('LLMInferenceService/model'));
    services = {};
    rerender();
    expect(result.current).toEqual({});
    expect(getPendingWorkloads).toHaveBeenCalledTimes(1);
  });

  it('should propagate caller cancellation and not start already-aborted requests', () => {
    const controller = new AbortController();
    let requestSignal: AbortSignal | undefined;
    const getPendingWorkloads: ModelServingDataServices['getPendingWorkloads'] = jest.fn(
      (_namespace, _queue, opts) => {
        requestSignal = opts?.signal;
        return new Promise(() => {
          /* Keep the request pending until cancellation. */
        });
      },
    );
    const { unmount } = renderHook(
      () => useQueuePositionsForDeployments('namespace', statusMap, { signal: controller.signal }),
      { wrapper: createWrapper({ getPendingWorkloads }) },
    );
    controller.abort();
    expect(requestSignal?.aborted).toBe(true);
    unmount();
    renderHook(
      () => useQueuePositionsForDeployments('namespace', statusMap, { signal: controller.signal }),
      { wrapper: createWrapper({ getPendingWorkloads }) },
    );
    expect(getPendingWorkloads).toHaveBeenCalledTimes(1);
  });

  it.each(['Forbidden', 'Not Found', 'Network unavailable'])(
    'should leave deployments loaded without enrichment when optional watches fail: %s',
    (error) => {
      jest.mocked(useKueueStatusForDeployments).mockReturnValue({
        kueueStatusByDeploymentKey: statusMap,
        isLoading: true,
        error,
      });
      const getPendingWorkloads = jest.fn(async () => summary());
      const { result } = renderHook(() => useKueueStatusWithQueuePositions([], undefined), {
        wrapper: createWrapper({ getPendingWorkloads }),
      });
      expect(result.current).toEqual({
        kueueStatusByDeploymentKey: {},
        isLoading: false,
      });
      expect(getPendingWorkloads).not.toHaveBeenCalled();
    },
  );
});
