import { testHook } from '@odh-dashboard/jest-config/hooks';
import { TimeframeTitle } from '@odh-dashboard/ui-core/types/metrics';
import { TimeframeStep, TimeframeTimeRange } from '@odh-dashboard/ui-core/utilities/metrics';
import { mockPrometheusQueryResponse } from '@odh-dashboard/model-serving/__mocks__/mockPrometheusQueryResponse';
import useQueryRangeResourceData from '../useQueryRangeResourceData';
import * as usePrometheusQueryRangeModule from '../usePrometheusQueryRange';

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
