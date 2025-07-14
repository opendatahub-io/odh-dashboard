import { act } from 'react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import axios from '#~/utilities/axios';
import { mockPVCK8sResource } from '#~/__mocks__/mockPVCK8sResource';
import { mockPrometheusQueryResponse } from '#~/__mocks__/mockPrometheusQueryResponse';
import { usePVCFreeAmount } from '#~/api/prometheus/pvcs';
import { POLL_INTERVAL } from '#~/utilities/const';

jest.mock('#~/utilities/axios', () => ({
  post: jest.fn(),
}));

jest.useFakeTimers();
const mockAxios = jest.mocked(axios.post);

describe('usePVCFreeAmount', () => {
  const pvcFreeAmountMock = mockPVCK8sResource({});
  it('should fetch and return pvc free amount', async () => {
    mockAxios.mockResolvedValue({ data: { response: mockPrometheusQueryResponse({}) } });

    const renderResult = await testHook(usePVCFreeAmount)(pvcFreeAmountMock);
    expect(renderResult).hookToStrictEqual([NaN, false, undefined]);
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(mockAxios).toHaveBeenCalledWith('/api/prometheus/pvc', {
      query:
        "namespace=test-project&query=kubelet_volume_stats_used_bytes{persistentvolumeclaim='test-storage'}",
    });
    expect(renderResult).hookToHaveUpdateCount(1);

    //wait for update
    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual([50, true, undefined]);
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockAxios).toHaveBeenCalledWith('/api/prometheus/pvc', {
      query:
        "namespace=test-project&query=kubelet_volume_stats_used_bytes{persistentvolumeclaim='test-storage'}",
    });
    expect(renderResult).hookToBeStable([false, false, true]);

    //set interval
    mockAxios.mockResolvedValue({
      data: { response: mockPrometheusQueryResponse({ value: [1704899825.644, '16'] }) },
    });
    await act(() => {
      jest.advanceTimersByTime(POLL_INTERVAL);
    });

    expect(renderResult).hookToStrictEqual([16, true, undefined]);
    expect(mockAxios).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(mockAxios).toHaveBeenCalledWith('/api/prometheus/pvc', {
      query:
        "namespace=test-project&query=kubelet_volume_stats_used_bytes{persistentvolumeclaim='test-storage'}",
    });
    expect(renderResult).hookToBeStable([false, true, true]);
  });

  it('should handle errors and rethrows', async () => {
    mockAxios.mockRejectedValue(new Error('error'));
    const renderResult = await testHook(usePVCFreeAmount)(pvcFreeAmountMock);
    expect(renderResult).hookToStrictEqual([NaN, false, undefined]);
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(mockAxios).toHaveBeenCalledWith('/api/prometheus/pvc', {
      query:
        "namespace=test-project&query=kubelet_volume_stats_used_bytes{persistentvolumeclaim='test-storage'}",
    });
    expect(renderResult).hookToHaveUpdateCount(1);

    //wait for update
    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual([NaN, false, new Error('error')]);
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockAxios).toHaveBeenCalledWith('/api/prometheus/pvc', {
      query:
        "namespace=test-project&query=kubelet_volume_stats_used_bytes{persistentvolumeclaim='test-storage'}",
    });
    expect(renderResult).hookToBeStable([true, true, false]);

    //set interval
    mockAxios.mockRejectedValue(new Error('error1'));
    await act(() => {
      jest.advanceTimersByTime(POLL_INTERVAL);
    });

    expect(renderResult).hookToStrictEqual([NaN, false, new Error('error1')]);
    expect(mockAxios).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(mockAxios).toHaveBeenCalledWith('/api/prometheus/pvc', {
      query:
        "namespace=test-project&query=kubelet_volume_stats_used_bytes{persistentvolumeclaim='test-storage'}",
    });
    expect(renderResult).hookToBeStable([true, true, false]);
  });
});
