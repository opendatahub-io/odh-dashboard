import type { PrometheusQueryResponse } from '@odh-dashboard/k8s-core/prometheus';

type MockPrometheusQueryResponseType = {
  value?: [number, string];
};

export const mockPrometheusQueryResponse = ({
  value = [1704910625.644, '50'],
}: MockPrometheusQueryResponseType): PrometheusQueryResponse => ({
  data: {
    result: [
      {
        value,
      },
    ],
    resultType: 'matrix',
  },
  status: 'success',
});
