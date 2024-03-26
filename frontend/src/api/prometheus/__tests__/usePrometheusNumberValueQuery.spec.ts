import { act } from '@testing-library/react';
import axios from 'axios';
import { mockPrometheusQueryResponse } from '~/__mocks__/mockPrometheusQueryResponse';
import { standardUseFetchState, testHook } from '~/__tests__/unit/testUtils/hooks';
import usePrometheusNumberValueQuery from '~/api/prometheus/usePrometheusNumberValueQuery';

jest.mock('axios', () => ({
  post: jest.fn(),
}));

const mockAxios = jest.mocked(axios.post);

describe('usePrometheusNumberValueQuery', () => {
  const query = `namespace=test-project`;

  it('should return and fetch prometheus query', async () => {
    const prometheusResponse = {
      data: { response: mockPrometheusQueryResponse({ value: [0, '5'] }) },
    };
    mockAxios.mockResolvedValue(prometheusResponse);
    const renderResult = await testHook(usePrometheusNumberValueQuery)(query);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(undefined));
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(mockAxios).toHaveBeenCalledWith('/api/prometheus/query', {
      query: 'namespace=test-project',
    });
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(5, true));
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
    await testHook(usePrometheusNumberValueQuery)('');
    expect(mockAxios).toHaveBeenCalledTimes(0);
  });

  it('should handle errors and rethrow', async () => {
    mockAxios.mockRejectedValue(new Error('error1'));

    const renderResult = testHook(usePrometheusNumberValueQuery)(query);
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(standardUseFetchState(undefined));
    expect(renderResult).hookToHaveUpdateCount(1);

    // wait for update
    await renderResult.waitForNextUpdate();
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState(undefined, false, new Error('error1')),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([true, true, false, true]);

    mockAxios.mockRejectedValue(new Error('error2'));
    await act(() => renderResult.result.current[3]());
    expect(mockAxios).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToStrictEqual(
      standardUseFetchState(undefined, false, new Error('error2')),
    );
    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([true, true, false, true]);
  });
});
