import { EvaluationJob } from '~/app/types';

export const getEvaluationName = (job: EvaluationJob): string =>
  job.name || job.resource.tenant || job.resource.id;

export const getBenchmarkName = (job: EvaluationJob): string =>
  job.benchmarks.length > 0 ? job.benchmarks[0].id : '-';

export const getResultDisplay = (job: EvaluationJob): string => {
  if (job.results.test?.score != null) {
    return `${Math.round(job.results.test.score * 100)}%`;
  }
  if (job.results.benchmarks?.length) {
    const firstBenchmark = job.results.benchmarks[0];
    if (firstBenchmark.test?.primary_score != null) {
      return `${Math.round(firstBenchmark.test.primary_score * 100)}%`;
    }
    if (firstBenchmark.metrics) {
      const metricEntries = Object.entries(firstBenchmark.metrics);
      if (metricEntries.length > 0) {
        const value = metricEntries[0][1];
        if (typeof value === 'number') {
          return `${Math.round(value * 100)}%`;
        }
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
