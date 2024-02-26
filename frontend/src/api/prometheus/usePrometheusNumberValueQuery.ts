import * as React from 'react';
import { PrometheusQueryResponse } from '~/types';
import { FetchState } from '~/utilities/useFetchState';
import usePrometheusQuery from './usePrometheusQuery';

const parsePrometheusNumberValue = (result?: PrometheusQueryResponse | null) => {
  const valueStr = result?.data.result[0]?.value[1];
  return valueStr ? Number(valueStr) : undefined;
};

const usePrometheusNumberValueQuery = (
  query?: string,
  refreshRate = 0,
): FetchState<number | undefined> => {
  const [result, loaded, loadError, refetch] = usePrometheusQuery('/api/prometheus/query', query, {
    initialPromisePurity: true,
    refreshRate,
  });
  const value = React.useMemo(() => parsePrometheusNumberValue(result), [result]);
  const refetchValue = React.useMemo(
    () => async () => parsePrometheusNumberValue(await refetch()),
    [refetch],
  );
  return [value, loaded, loadError, refetchValue];
};

export default usePrometheusNumberValueQuery;
