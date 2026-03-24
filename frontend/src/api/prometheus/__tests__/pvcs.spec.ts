import { act } from 'react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import axios from '#~/utilities/axios';
import { mockPVCK8sResource } from '#~/__mocks__/mockPVCK8sResource';
import { usePVCFreeAmount } from '#~/api/prometheus/pvcs';
import { POLL_INTERVAL } from '#~/utilities/const';

jest.mock('#~/utilities/axios', () => ({
  post: jest.fn(),
}));

jest.useFakeTimers();
const mockAxios = jest.mocked(axios.post);

const mockPvcMetricsResponse = (usedBytes: string, capacityBytes: string) => ({
  data: {
    response: {
      data: {
        result: [
          {
            metric: { __name__: 'kubelet_volume_stats_used_bytes' },
            value: [1704910625, usedBytes],
          },
          {
            metric: { __name__: 'kubelet_volume_stats_capacity_bytes' },
            value: [1704910625, capacityBytes],
          },
        ],
        resultType: 'vector',
      },
      status: 'success',
    },
  },
});

describe('usePVCFreeAmount', () => {
  const pvcMock = mockPVCK8sResource({});

  it('should fetch both metrics in a single query and return usage info', async () => {
    mockAxios.mockResolvedValue(mockPvcMetricsResponse('1024', '5368709120'));

    const renderResult = await testHook(usePVCFreeAmount)(pvcMock);
    expect(renderResult).hookToStrictEqual([
      { usedInBytes: NaN, capacityInBytes: NaN },
      false,
      undefined,
    ]);
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(mockAxios).toHaveBeenCalledWith('/api/prometheus/pvc', {
      query: expect.stringContaining(
        'kubelet_volume_stats_used_bytes|kubelet_volume_stats_capacity_bytes',
      ),
    });

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToStrictEqual([
      { usedInBytes: 1024, capacityInBytes: 5368709120 },
      true,
      undefined,
    ]);
  });

  it('should handle errors', async () => {
    mockAxios.mockRejectedValue(new Error('error'));
    const renderResult = await testHook(usePVCFreeAmount)(pvcMock);

    await renderResult.waitForNextUpdate();
    const [info, loaded, err] = renderResult.result.current;
    expect(info).toEqual({ usedInBytes: NaN, capacityInBytes: NaN });
    expect(loaded).toBe(false);
    expect(err).toBeInstanceOf(Error);
  });

  it('should refetch on interval via refreshRate', async () => {
    mockAxios.mockResolvedValue(mockPvcMetricsResponse('1024', '5368709120'));

    const renderResult = await testHook(usePVCFreeAmount)(pvcMock);
    await renderResult.waitForNextUpdate();

    const initialCalls = mockAxios.mock.calls.length;

    mockAxios.mockResolvedValue(mockPvcMetricsResponse('2048', '5368709120'));
    await act(() => {
      jest.advanceTimersByTime(POLL_INTERVAL);
    });

    expect(mockAxios.mock.calls.length).toBeGreaterThan(initialCalls);
  });
});
