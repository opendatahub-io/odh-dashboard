import { EvaluationJob } from '~/app/types';

export const getEvaluationName = (job: EvaluationJob): string =>
  job.name || job.resource.tenant || job.resource.id;

export const getBenchmarkName = (job: EvaluationJob): string =>
  job.benchmarks && job.benchmarks.length > 0 ? job.benchmarks[0].id : '-';

export const getBenchmarkDisplayName = (id: string): string =>
  id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const getResultScore = (job: EvaluationJob): string => {
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

export const getResultPass = (job: EvaluationJob): boolean | null => {
  if (job.results.test?.pass != null) {
    return job.results.test.pass;
  }
  if (job.results.benchmarks?.length) {
    const first = job.results.benchmarks[0];
    if (first.test?.pass != null) {
      return first.test.pass;
    }
  }
  return null;
};

export const formatDuration = (startStr?: string, endStr?: string): string | null => {
  if (!startStr || !endStr) {
    return null;
  }
  try {
    const ms = new Date(endStr).getTime() - new Date(startStr).getTime();
    if (ms <= 0 || !Number.isFinite(ms)) {
      return null;
    }
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const h = hours === 1 ? 'hour' : 'hours';
    const m = minutes === 1 ? 'minute' : 'minutes';
    if (hours > 0) {
      return minutes > 0 ? `${hours} ${h} ${minutes} ${m}` : `${hours} ${h}`;
    }
    return minutes > 0 ? `${minutes} ${m}` : '< 1 minute';
  } catch {
    return null;
  }
};

export const formatDate = (dateStr?: string): string => {
  if (!dateStr) {
    return '-';
  }
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateStr;
  }
};
