import { act } from 'react';
import axios from '#~/utilities/axios';
import { mockPrometheusQueryResponse } from '#~/__mocks__/mockPrometheusQueryResponse';
import { standardUseFetchState, testHook } from '#~/__tests__/unit/testUtils/hooks';
import usePrometheusQuery from '#~/api/prometheus/usePrometheusQuery';

jest.mock('#~/utilities/axios', () => ({
  post: jest.fn(),
}));

const mockAxios = jest.mocked(axios.post);

describe('usePrometheusQuery', () => {
  const apiPath = '/api/prometheus/pvc';
  const query = `namespace=test-project`;

  it('should return and fetch prometheus query', async () => {
    const prometheusResponse = { data: { response: mockPrometheusQueryResponse({}) } };
    mockAxios.mockResolvedValue(prometheusResponse);
    const renderResult = await testHook(usePrometheusQuery)(apiPath, query);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null));
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(mockAxios).toHaveBeenCalledWith('/api/prometheus/pvc', {
      query: 'namespace=test-project',
    });
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState(prometheusResponse.data.response, true),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([false, false, true, true]);

    // refresh
    mockAxios.mockResolvedValue(prometheusResponse);
    await act(() => renderResult.result.current[3]());
    expect(mockAxios).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([false, true, true, true]);
  });

  it('should handle when query is empty string', async () => {
    await testHook(usePrometheusQuery)(apiPath, '');
    expect(mockAxios).toHaveBeenCalledTimes(0);
  });

  it('should handle errors and rethrow', async () => {
    mockAxios.mockRejectedValue(new Error('error1'));

    const renderResult = testHook(usePrometheusQuery)(apiPath, query);
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null, false, new Error('error1')));
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([true, true, false, true]);

    mockAxios.mockRejectedValue(new Error('error2'));
    await act(() => renderResult.result.current[3]());
    expect(mockAxios).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(null, false, new Error('error2')));
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([true, true, false, true]);
  });
});
