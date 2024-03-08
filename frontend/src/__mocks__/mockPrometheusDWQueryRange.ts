import { PrometheusQueryRangeResponse, PrometheusQueryRangeResponseDataResult } from '~/types';

type MockPrometheusDWQueryRangeType = {
  result?: PrometheusQueryRangeResponseDataResult[];
};

export const mockPrometheusDWQueryRange = ({
  result,
}: MockPrometheusDWQueryRangeType): {
  code?: number;
  response: PrometheusQueryRangeResponse;
} => ({
  code: 200,
  response: {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: result ?? [
        {
          metric: {},
          values: [],
        },
      ],
    },
  },
});
