import * as React from 'react';
import { TimeframeStep, TimeframeTimeRange } from '~/pages/modelServing/screens/const';
import { TimeframeTitle } from '~/pages/modelServing/screens/types';
import {
  ContextResourceData,
  PrometheusQueryRangeResponseDataResult,
  PrometheusQueryRangeResultValue,
} from '~/types';
import { useContextResourceData } from '~/utilities/useContextResourceData';
import usePrometheusQueryRange, { ResponsePredicate } from './usePrometheusQueryRange';

const useQueryRangeResourceData = (
  /** Is the query active -- should we be fetching? */
  active: boolean,
  query: string,
  end: number,
  timeframe: TimeframeTitle,
): ContextResourceData<PrometheusQueryRangeResultValue> =>
  useContextResourceData<PrometheusQueryRangeResultValue>(
    usePrometheusQueryRange(
      active,
      '/api/prometheus/serving',
      query,
      TimeframeTimeRange[timeframe],
      end,
      TimeframeStep[timeframe],
    ),
    5 * 60 * 1000,
  );

type TrustyData = PrometheusQueryRangeResponseDataResult;

/*
 * TODO:
 * - Keep the ResponsePredicate to be what is actually used.
 * - Consider renaming
 * - Might need to turn usePrometheusQueryRange into a generic.
 */
export const useQueryRangeResourceDataTrusty = (
  /** Is the query active -- should we be fetching? */
  active: boolean,
  query: string,
  end: number,
  timeframe: TimeframeTitle,
): ContextResourceData<TrustyData> => {
  const responsePredicate = React.useCallback<ResponsePredicate<TrustyData>>(
    (data) => data.result,
    [],
  );
  return useContextResourceData<TrustyData>(
    usePrometheusQueryRange(
      active,
      '/api/prometheus/serving',
      query,
      TimeframeTimeRange[timeframe],
      end,
      TimeframeStep[timeframe],
      responsePredicate,
    ),
    5 * 60 * 1000,
  );
};
export default useQueryRangeResourceData;
