import { EvaluationJob } from '~/app/types';

export const DETAIL_POLL_INTERVAL_MS = 10_000;
export const RETRY_DELAY_MS = 5_000;
export const MAX_RETRY_ATTEMPTS = 5;
export const MAX_CONCURRENT_DETAIL_REQUESTS = 5;

type RequestPool = {
  enqueue: <T>(fn: () => Promise<T>, signal?: AbortSignal) => Promise<T>;
};

// FIFO queue that limits concurrent requests. Tasks wait until a slot opens, keeping at most `maxConcurrent` in flight.
// Queued tasks that have been aborted via signal are skipped when their slot opens.
export const createRequestPool = (maxConcurrent = MAX_CONCURRENT_DETAIL_REQUESTS): RequestPool => {
  const queue: Array<{ run: () => Promise<void>; signal?: AbortSignal }> = [];
  let activeCount = 0;

  const dispatch = (): void => {
    while (activeCount < maxConcurrent && queue.length > 0) {
      const entry = queue.shift()!;
      if (entry.signal?.aborted) {
        continue;
      }
      activeCount++;
      entry.run().finally(() => {
        activeCount--;
        dispatch();
      });
    }
  };

  return {
    enqueue: <T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> =>
      new Promise<T>((resolve, reject) => {
        if (signal?.aborted) {
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }
        const rejectAbort = () => reject(new DOMException('Aborted', 'AbortError'));
        signal?.addEventListener('abort', rejectAbort, { once: true });
        queue.push({
          run: () => {
            signal?.removeEventListener('abort', rejectAbort);
            return fn().then(resolve, reject);
          },
          signal,
        });
        dispatch();
      }),
  };
};

// Returns the earliest timestamp any benchmark actually started, or undefined if none have started yet.
// Use this to detect pre-start failures — unlike getEarliestStartTime it does NOT fall back to created_at.
export const getEarliestBenchmarkStartTime = (job: EvaluationJob): string | undefined => {
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
  return undefined;
};

// Returns true when a failed job never produced any runner feedback — no started_at, no
// error_message, and no warning_message on any benchmark. This distinguishes a k8s-level
// pre-start failure (pod never ran evaluation work) from a runtime failure (runner started
// but failed and reported errors or warnings).
export const isPreStartFailure = (job: EvaluationJob): boolean => {
  if (job.status.state !== 'failed') {
    return false;
  }
  const benchmarks = job.status.benchmarks ?? [];
  return (
    !getEarliestBenchmarkStartTime(job) &&
    !benchmarks.some((b) => b.error_message?.message || b.warning_message?.message)
  );
};

// Returns the earliest benchmark started_at timestamp, or falls back to job created_at.
// Use this as the elapsed-time anchor — created_at approximates when the job began when benchmarks haven't reported yet.
export const getEarliestStartTime = (job: EvaluationJob): string | undefined =>
  getEarliestBenchmarkStartTime(job) ?? job.resource.created_at;

// Formats the duration from startTime to now as a human-readable string (e.g. "1h 4m").
// Omits seconds since elapsed time only updates on each 10s polling cycle.
export const formatElapsedTime = (startTime: string): string => {
  const ms = Date.now() - new Date(startTime).getTime();
  if (ms <= 0 || !Number.isFinite(ms)) {
    return '< 1m';
  }
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return '< 1m';
};
