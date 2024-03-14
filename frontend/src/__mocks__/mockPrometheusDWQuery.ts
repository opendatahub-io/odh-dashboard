import { PrometheusQueryResponse } from '~/types';

type MockPrometheusDWQueryType = {
  result?: { value: [number, string] }[];
};

export const mockPrometheusDWQuery = ({
  result,
}: MockPrometheusDWQueryType): {
  code?: number;
  response: PrometheusQueryResponse;
} => ({
  code: 200,
  response: {
    status: 'success',
    data: {
      resultType: 'vector',
      result: result ?? [],
    },
  },
});
