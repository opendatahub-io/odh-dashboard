import React from 'react';
import { TimeframeTitle } from '#~/concepts/metrics/types';
import { TimeframeStep, TimeframeTimeRange } from '#~/concepts/metrics/const';
import { PendingContextResourceData, PrometheusQueryRangeResultValue } from '#~/types';
import { FetchOptions } from '#~/utilities/useFetchState';
import { useMakeFetchObject } from '#~/utilities/useMakeFetchObject';
import usePrometheusQueryRange, { ResponsePredicate } from './usePrometheusQueryRange';

const useQueryRangeResourceData = <T = PrometheusQueryRangeResultValue>(
  /** Is the query active -- should we be fetching? */
  active: boolean,
  query: string,
  end: number,
  timeframe: TimeframeTitle,
  responsePredicate: ResponsePredicate<T>,
  namespace: string,
  apiPath = '/api/prometheus/serving',
  fetchOptions?: Partial<FetchOptions>,
): PendingContextResourceData<T> => {
  const [data, error, loaded, refresh, pending] = usePrometheusQueryRange<T>(
    active,
    apiPath,
    query,
    TimeframeTimeRange[timeframe],
    end,
    TimeframeStep[timeframe],
    responsePredicate,
    namespace,
    fetchOptions,
  );
  const fetchObject = useMakeFetchObject([data, error, loaded, refresh]);
  return React.useMemo(() => ({ ...fetchObject, pending }), [fetchObject, pending]);
};

export default useQueryRangeResourceData;
