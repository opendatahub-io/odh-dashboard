import * as React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  ModelServingDataContext,
  type ModelServingDataServices,
} from '@odh-dashboard/model-serving/shared/contexts/ModelServingDataContext';
import { useGetGatewayOptions } from '../useGatewayOptions';
import type { GatewayOption } from '../../api/gatewayDiscovery';

type GatewayDiscovery = NonNullable<ModelServingDataServices['getGatewayOptions']>;

describe('useGetGatewayOptions', () => {
  it('should settle as loaded-empty when the host does not support discovery', () => {
    const { result } = renderHook(() => useGetGatewayOptions('namespace'));
    expect(result.current).toMatchObject({ data: [], loaded: true, error: undefined });
  });

  it('should expose a supported host service and cancel it on unmount', async () => {
    const getGatewayOptions = jest.fn<ReturnType<GatewayDiscovery>, Parameters<GatewayDiscovery>>(
      async () => [{ name: 'gateway', namespace: 'gateway-ns' }],
    );
    const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
      <ModelServingDataContext.Provider value={{ getGatewayOptions }}>
        {children}
      </ModelServingDataContext.Provider>
    );
    const { result, unmount } = renderHook(() => useGetGatewayOptions('namespace'), { wrapper });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.data).toEqual([{ name: 'gateway', namespace: 'gateway-ns' }]);
    expect(getGatewayOptions).toHaveBeenCalledWith('namespace', {
      signal: expect.any(AbortSignal),
    });
    const signal = jest.mocked(getGatewayOptions).mock.calls[0][1]?.signal;
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it('should report host errors without leaving the field loading', async () => {
    const error = new Error('Discovery unavailable');
    const getGatewayOptions = jest.fn(() => Promise.reject(error));
    const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
      <ModelServingDataContext.Provider value={{ getGatewayOptions }}>
        {children}
      </ModelServingDataContext.Provider>
    );
    const { result } = renderHook(() => useGetGatewayOptions('namespace'), { wrapper });
    await waitFor(() => expect(result.current.error).toBe(error));
    expect(result.current.data).toEqual([]);
  });

  it('should discard discovery results from an old namespace', async () => {
    const requests: ((value: GatewayOption[]) => void)[] = [];
    const getGatewayOptions: ModelServingDataServices['getGatewayOptions'] = () =>
      new Promise((resolve) => {
        requests.push(resolve);
      });
    const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
      <ModelServingDataContext.Provider value={{ getGatewayOptions }}>
        {children}
      </ModelServingDataContext.Provider>
    );
    const { result, rerender } = renderHook(({ namespace }) => useGetGatewayOptions(namespace), {
      initialProps: { namespace: 'old' },
      wrapper,
    });
    rerender({ namespace: 'new' });
    await act(async () => requests[1]([{ name: 'new-gateway', namespace: 'new' }]));
    await act(async () => requests[0]([{ name: 'old-gateway', namespace: 'old' }]));
    expect(result.current.data).toEqual([{ name: 'new-gateway', namespace: 'new' }]);
  });
});
