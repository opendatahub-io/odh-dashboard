// TODO mturley these imports from ~/pages/modelServing/* should be moved somewhere page-agnostic
import { TimeframeStep, TimeframeTimeRange } from '~/pages/modelServing/screens/const';
import { PrometheusQueryRangeResultValue } from '~/types';
import useRestructureContextResourceData from '~/utilities/useRestructureContextResourceData';
import { FetchOptions } from '~/utilities/useFetchState';
import { TimeframeTitle } from '~/pages/modelServing/screens/types';
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
): ReturnType<typeof useRestructureContextResourceData<T>> =>
  useRestructureContextResourceData<T>(
    usePrometheusQueryRange<T>(
      active,
      apiPath,
      query,
      TimeframeTimeRange[timeframe],
      end,
      TimeframeStep[timeframe],
      responsePredicate,
      namespace,
      fetchOptions,
    ),
  );

export default useQueryRangeResourceData;
