import { act } from 'react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import axios from '#~/utilities/axios';
import { mockPrometheusServing } from '#~/__mocks__/mockPrometheusServing';
import usePrometheusQueryRange from '#~/api/prometheus/usePrometheusQueryRange';
import { PrometheusQueryRangeResponseData } from '#~/types';

jest.mock('#~/utilities/axios', () => ({
  post: jest.fn(),
}));

const mockAxios = jest.mocked(axios.post);
const responsePredicate = jest.fn(
  (data: PrometheusQueryRangeResponseData) => data.result?.flatMap((item) => item.values[0]) || [],
);
describe('usePrometheusQueryRange', () => {
  const queryLang = 'testQuery';
  const span = 60;
  const endInMs = 123456;
  const step = 30;
  const namespace = 'testNamespace';
  const active = true;

  it('should fetch data successfully and handle refresh ', async () => {
    const mockedResponse = { data: { response: mockPrometheusServing({}).response } };
    mockAxios.mockResolvedValue(mockedResponse);

    const renderResult = testHook(usePrometheusQueryRange)(
      active,
      '/api/prometheus/serving',
      queryLang,
      span,
      endInMs,
      step,
      responsePredicate,
      namespace,
    );

    expect(renderResult).hookToStrictEqual([[], false, undefined, expect.any(Function), true]);
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(mockAxios).toHaveBeenCalledWith('/api/prometheus/serving', {
      query: 'namespace=testNamespace&query=testQuery&start=63.456&end=123.456&step=30',
    });
    expect(renderResult).hookToHaveUpdateCount(1);
    expect(responsePredicate).not.toHaveBeenCalled();

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual([
      [1704899825.644, '16'],
      true,
      undefined,
      expect.any(Function),
      false,
    ]);
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(mockAxios).toHaveBeenCalledWith('/api/prometheus/serving', {
      query: 'namespace=testNamespace&query=testQuery&start=63.456&end=123.456&step=30',
    });
    expect(responsePredicate).toHaveBeenCalledWith(mockedResponse.data.response.data);
    expect(responsePredicate).toBeCalledTimes(1);

    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([false, false, true, true, false]);

    mockAxios.mockResolvedValue(mockedResponse);
    await act(() => renderResult.result.current[3]());

    expect(renderResult).hookToStrictEqual([
      [1704899825.644, '16'],
      true,
      undefined,
      expect.any(Function),
      false,
    ]);
    expect(mockAxios).toHaveBeenCalledTimes(2);
    expect(mockAxios).toHaveBeenCalledWith('/api/prometheus/serving', {
      query: 'namespace=testNamespace&query=testQuery&start=63.456&end=123.456&step=30',
    });
    expect(responsePredicate).toHaveBeenCalledWith(mockedResponse.data.response.data);
    expect(responsePredicate).toBeCalledTimes(2);

    expect(renderResult).hookToHaveUpdateCount(3);
    expect(renderResult).hookToBeStable([false, true, true, true, true]);
  });
  it('should handle error when active is false', async () => {
    const renderResult = testHook(usePrometheusQueryRange)(
      false,
      '/api/prometheus/serving',
      queryLang,
      span,
      endInMs,
      step,
      responsePredicate,
      namespace,
    );

    expect(renderResult).hookToStrictEqual([[], false, undefined, expect.any(Function), false]);
    expect(mockAxios).not.toHaveBeenCalled();
    expect(responsePredicate).not.toHaveBeenCalled();
  });
  it('should handle error when request fails', async () => {
    mockAxios.mockRejectedValue(new Error('error1'));
    const renderResult = testHook(usePrometheusQueryRange)(
      active,
      '/api/prometheus/serving',
      queryLang,
      span,
      endInMs,
      step,
      responsePredicate,
      namespace,
    );
    expect(renderResult).hookToStrictEqual([[], false, undefined, expect.any(Function), true]);
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(mockAxios).toHaveBeenCalledWith('/api/prometheus/serving', {
      query: 'namespace=testNamespace&query=testQuery&start=63.456&end=123.456&step=30',
    });
    expect(responsePredicate).not.toHaveBeenCalled();
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual([
      [],
      false,
      new Error('error1'),
      expect.any(Function),
      false,
    ]);
    expect(mockAxios).toHaveBeenCalledTimes(1);
    expect(responsePredicate).not.toHaveBeenCalled();
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(renderResult).hookToBeStable([true, true, false, true, false]);

    mockAxios.mockRejectedValue(new Error('error2'));
    await act(() => renderResult.result.current[3]());
    expect(mockAxios).toHaveBeenCalledTimes(2);
    expect(renderResult).hookToStrictEqual([
      [],
      false,
      new Error('error2'),
      expect.any(Function),
      false,
    ]);
    expect(mockAxios).toHaveBeenCalledTimes(2);
    expect(responsePredicate).not.toHaveBeenCalled();
    expect(renderResult).hookToHaveUpdateCount(3);

    expect(renderResult).hookToBeStable([true, true, false, true, true]);
  });
});
