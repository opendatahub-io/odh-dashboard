import { WorkloadMetricPromQueryResponse } from '~/api';
import { mockPrometheusQueryVectorResponse } from './mockPrometheusQueryVectorResponse';

export const mockDWUsageByJobPrometheusResponse = (usageByJobName: {
  [jobName: string]: number;
}): WorkloadMetricPromQueryResponse =>
  mockPrometheusQueryVectorResponse({
    result: Object.entries(usageByJobName).map(([jobName, value]) => ({
      // eslint-disable-next-line camelcase
      metric: { workload: jobName, workload_type: 'job' },
      value: [0, String(value)],
    })),
  });
