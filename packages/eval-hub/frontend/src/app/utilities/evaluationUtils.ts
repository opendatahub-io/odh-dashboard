import { EvaluationJob } from '~/app/types';

export const getEvaluationName = (job: EvaluationJob): string =>
  job.resource.tenant || job.resource.id;

export const getBenchmarkName = (job: EvaluationJob): string =>
  job.benchmarks.length > 0 ? job.benchmarks[0].id : '-';

export const getResultDisplay = (job: EvaluationJob): string => {
  if (job.results.benchmarks?.length) {
    const firstBenchmark = job.results.benchmarks[0];
    if (firstBenchmark.metrics) {
      const metricEntries = Object.entries(firstBenchmark.metrics);
      if (metricEntries.length > 0) {
        const [, value] = metricEntries[0];
        return `${Math.round(value * 100)}%`;
      }
    }
  }
  return '-';
};

export const formatDate = (dateStr?: string): string => {
  if (!dateStr) {
    return '-';
  }
  try {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return dateStr;
  }
};
