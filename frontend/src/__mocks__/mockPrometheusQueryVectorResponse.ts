import { PrometheusQueryResponse } from '#~/types';

type MockPrometheusQueryVectorResponseType<TResultExtraProps extends object = object> = {
  result?: PrometheusQueryResponse<TResultExtraProps>['data']['result'];
};

export const mockPrometheusQueryVectorResponse = <TResultExtraProps extends object = object>({
  result,
}: MockPrometheusQueryVectorResponseType<TResultExtraProps>): PrometheusQueryResponse<TResultExtraProps> => ({
  status: 'success',
  data: {
    resultType: 'vector',
    result: result ?? [],
  },
});
