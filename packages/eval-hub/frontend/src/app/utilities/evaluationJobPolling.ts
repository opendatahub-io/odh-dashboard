import { EvaluationJob } from '~/app/types';

export const DETAIL_POLL_INTERVAL_MS = 10_000;
export const RETRY_DELAY_MS = 5_000;
export const MAX_RETRY_ATTEMPTS = 5;
export const MAX_CONCURRENT_DETAIL_REQUESTS = 5;

type RequestPool = {
  enqueue: <T>(fn: () => Promise<T>) => Promise<T>;
};

// FIFO queue that limits concurrent requests. Tasks wait until a slot opens, keeping at most `maxConcurrent` in flight.
export const createRequestPool = (maxConcurrent = MAX_CONCURRENT_DETAIL_REQUESTS): RequestPool => {
  const queue: (() => Promise<void>)[] = [];
  let activeCount = 0;

  const dispatch = (): void => {
    while (activeCount < maxConcurrent && queue.length > 0) {
      const run = queue.shift()!;
      activeCount++;
      run().finally(() => {
        activeCount--;
        dispatch();
      });
    }
  };

  return {
    enqueue: <T>(fn: () => Promise<T>): Promise<T> =>
      new Promise<T>((resolve, reject) => {
        queue.push(() => fn().then(resolve, reject));
        dispatch();
      }),
  };
};

// Returns the earliest benchmark started_at timestamp, or falls back to job created_at.
export const getEarliestStartTime = (job: EvaluationJob): string | undefined => {
  const { benchmarks } = job.status;
  if (benchmarks?.length) {
    const startTimes = benchmarks
      .map((b) => b.started_at)
      .filter((t): t is string => !!t)
      .map((t) => new Date(t).getTime())
      .filter((t) => Number.isFinite(t));
    if (startTimes.length > 0) {
      return new Date(Math.min(...startTimes)).toISOString();
    }
  }
  return job.resource.created_at;
};

// Formats the duration from startTime to now as a human-readable string (e.g. "4m 12s").
export const formatElapsedTime = (startTime: string): string => {
  const ms = Date.now() - new Date(startTime).getTime();
  if (ms <= 0 || !Number.isFinite(ms)) {
    return '< 1s';
  }
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};
