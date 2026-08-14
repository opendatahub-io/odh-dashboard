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
// hook: the required `post` transport seam. There is intentionally no plain-fetch
// default — runtime callers must inject an authenticated transport. The relocated
// core logic is additionally exercised end-to-end by the frontend axios wrapper's
// own test.

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
  afterEach(() => {
    jest.restoreAllMocks();
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
