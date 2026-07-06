import { testHook } from '@odh-dashboard/jest-config/hooks';
import { TimeframeTitle } from '#~/concepts/metrics/types';
import useQueryRangeResourceData from '#~/api/prometheus/useQueryRangeResourceData';
import { TimeframeStep, TimeframeTimeRange } from '#~/concepts/metrics/const';
import * as usePrometheusQueryRangeModule from '#~/api/prometheus/usePrometheusQueryRange';
import { mockPrometheusQueryResponse } from '#~/__mocks__/mockPrometheusQueryResponse';

describe('useQueryRangeResourceData', () => {
  const active = true;
  const query = 'testQuery';
  const end = 123456;
  const timeframe: TimeframeTitle = TimeframeTitle.ONE_HOUR;
  const responsePredicate = jest.fn();
  const namespace = 'testNamespace';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call usePrometheusQueryRange with correct arguments and restructure the returned data', async () => {
    const spy = jest.spyOn(usePrometheusQueryRangeModule, 'default');
    const mockedResponse = { data: { result: mockPrometheusQueryResponse({}) } };

    spy.mockReturnValue([
      mockedResponse.data.result.data.result,
      true,
      undefined,
      expect.any(Function),
      false,
    ]);

    const renderResult = testHook(useQueryRangeResourceData)(
      active,
      query,
      end,
      timeframe,
      responsePredicate,
      namespace,
    );

    expect(renderResult).hookToStrictEqual({
      data: mockedResponse.data.result.data.result,
      loaded: true,
      error: undefined,
      refresh: expect.any(Function),
      pending: false,
    });

    expect(renderResult).hookToHaveUpdateCount(1);

    expect(spy).toHaveBeenCalledWith(
      active,
      '/api/prometheus/serving',
      query,
      TimeframeTimeRange[timeframe],
      end,
      TimeframeStep[timeframe],
      responsePredicate,
      namespace,
      undefined,
    );

    // Restore the spy
    spy.mockRestore();
  });
});
