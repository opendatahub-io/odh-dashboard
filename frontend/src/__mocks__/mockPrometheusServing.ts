import { PrometheusQueryRangeResponse, PrometheusQueryRangeResponseDataResult } from '#~/types';

type MockPrometheusServingType = {
  result?: PrometheusQueryRangeResponseDataResult[];
};

export const mockPrometheusServing = ({
  result,
}: MockPrometheusServingType): {
  code: number;
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
          values: [
            [1704899825.644, '16'],
            [1704903425.644, '15'],
            [1704907025.644, '10'],
            [1704910625.644, '10'],
            [1704914225.644, '0'],
            [1704917825.644, '0'],
            [1704921425.644, '0'],
            [1704925025.644, '0'],
            [1704928625.644, '0'],
            [1704932225.644, '0'],
            [1704935825.644, '0'],
            [1704939425.644, '0'],
            [1704943025.644, '0'],
            [1704946625.644, '0'],
            [1704950225.644, '0'],
            [1704953825.644, '0'],
            [1704957425.644, '0'],
            [1704961025.644, '0'],
            [1704964625.644, '0'],
            [1704968225.644, '0'],
            [1704971825.644, '2'],
            [1704975425.644, '13'],
            [1704979025.644, '16'],
            [1704982625.644, '16'],
            [1704986225.644, '16'],
          ],
        },
      ],
    },
  },
});
