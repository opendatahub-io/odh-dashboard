import { act } from 'react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import type {
  PrometheusQueryRangeResponse,
  PrometheusQueryRangeResponseData,
  PrometheusQueryRangeResponseDataResult,
} from '../../../types/metrics';
import usePrometheusQueryRange, {
  defaultResponsePredicate,
  type PrometheusPostFn,
} from '../usePrometheusQueryRange';

// These tests cover the behavior this file introduces on top of the relocated
// hook: the injectable `post` transport seam and its `defaultPost` fetch-based
// default. The relocated core logic is additionally exercised end-to-end by the
// frontend axios wrapper's own test.

const queryLang = 'testQuery';
const span = 60;
const endInMs = 123456;
const step = 30;
const namespace = 'testNamespace';
const apiPath = '/api/prometheus/serving';
const expectedQuery = 'namespace=testNamespace&query=testQuery&start=63.456&end=123.456&step=30';

const responseData: PrometheusQueryRangeResponseData = {
  resultType: 'matrix',
  result: [{ values: [[1704899825.644, '16']] } as PrometheusQueryRangeResponseDataResult],
};

const responseEnvelope: { response: PrometheusQueryRangeResponse } = {
  response: { status: 'success', data: responseData },
};

describe('usePrometheusQueryRange', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('should use the injected post transport and pass its result to the predicate', async () => {
    const post = jest.fn<ReturnType<PrometheusPostFn>, Parameters<PrometheusPostFn>>(() =>
      Promise.resolve(responseEnvelope),
    );

    const renderResult = testHook(usePrometheusQueryRange)(
      true,
      apiPath,
      queryLang,
      span,
      endInMs,
      step,
      defaultResponsePredicate,
      namespace,
      undefined,
      post,
    );

    // pending flag is true while active and awaiting the first fetch
    expect(renderResult).hookToStrictEqual([[], false, undefined, expect.any(Function), true]);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(apiPath, { query: expectedQuery });

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual([
      [[1704899825.644, '16']],
      true,
      undefined,
      expect.any(Function),
      false,
    ]);
  });

  it('should not call the transport when inactive', () => {
    const post = jest.fn<ReturnType<PrometheusPostFn>, Parameters<PrometheusPostFn>>();

    const renderResult = testHook(usePrometheusQueryRange)(
      false,
      apiPath,
      queryLang,
      span,
      endInMs,
      step,
      defaultResponsePredicate,
      namespace,
      undefined,
      post,
    );

    expect(renderResult).hookToStrictEqual([[], false, undefined, expect.any(Function), false]);
    expect(post).not.toHaveBeenCalled();
  });

  it('should default to a fetch-based POST when no transport is provided', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(responseEnvelope),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const renderResult = testHook(usePrometheusQueryRange)(
      true,
      apiPath,
      queryLang,
      span,
      endInMs,
      step,
      defaultResponsePredicate,
      namespace,
    );

    await renderResult.waitForNextUpdate();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      apiPath,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: expectedQuery }),
      }),
    );
    expect(renderResult).hookToStrictEqual([
      [[1704899825.644, '16']],
      true,
      undefined,
      expect.any(Function),
      false,
    ]);
  });

  it('should surface an error when the default fetch response is not ok', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({}),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const renderResult = testHook(usePrometheusQueryRange)(
      true,
      apiPath,
      queryLang,
      span,
      endInMs,
      step,
      defaultResponsePredicate,
      namespace,
    );

    await renderResult.waitForNextUpdate();

    const [data, loaded, error] = renderResult.result.current;
    expect(data).toEqual([]);
    expect(loaded).toBe(false);
    expect(error).toEqual(new Error('Prometheus query failed: 500 Internal Server Error'));
  });

  it('should stabilize the refresh callback across an unchanged rerender', async () => {
    const post = jest.fn<ReturnType<PrometheusPostFn>, Parameters<PrometheusPostFn>>(() =>
      Promise.resolve(responseEnvelope),
    );

    const renderResult = testHook(usePrometheusQueryRange)(
      true,
      apiPath,
      queryLang,
      span,
      endInMs,
      step,
      defaultResponsePredicate,
      namespace,
      undefined,
      post,
    );

    await renderResult.waitForNextUpdate();

    const refreshBefore = renderResult.result.current[3];
    await act(async () => {
      renderResult.rerender(
        true,
        apiPath,
        queryLang,
        span,
        endInMs,
        step,
        defaultResponsePredicate,
        namespace,
        undefined,
        post,
      );
    });

    expect(renderResult.result.current[3]).toBe(refreshBefore);
  });
});
