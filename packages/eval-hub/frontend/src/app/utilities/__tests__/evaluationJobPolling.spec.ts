/* eslint-disable camelcase */
import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import {
  createRequestPool,
  getEarliestBenchmarkStartTime,
  getEarliestStartTime,
  formatElapsedTime,
  isPreStartFailure,
} from '~/app/utilities/evaluationJobPolling';

describe('createRequestPool', () => {
  it('should run tasks up to the concurrency limit', async () => {
    const pool = createRequestPool(2);
    const order: string[] = [];

    const task = (id: string, ms: number) => () =>
      new Promise<string>((resolve) => {
        order.push(`start-${id}`);
        setTimeout(() => {
          order.push(`end-${id}`);
          resolve(id);
        }, ms);
      });

    const results = await Promise.all([
      pool.enqueue(task('a', 50)),
      pool.enqueue(task('b', 30)),
      pool.enqueue(task('c', 10)),
    ]);

    expect(results).toEqual(['a', 'b', 'c']);
    expect(order[0]).toBe('start-a');
    expect(order[1]).toBe('start-b');
    expect(order.indexOf('start-c')).toBeGreaterThan(order.indexOf('end-b'));
  });

  it('should resolve all tasks when concurrency exceeds queue size', async () => {
    const pool = createRequestPool(10);
    const results = await Promise.all([
      pool.enqueue(() => Promise.resolve(1)),
      pool.enqueue(() => Promise.resolve(2)),
    ]);
    expect(results).toEqual([1, 2]);
  });

  it('should propagate rejections without blocking other tasks', async () => {
    const pool = createRequestPool(2);

    const results = await Promise.allSettled([
      pool.enqueue(() => Promise.reject(new Error('fail'))),
      pool.enqueue(() => Promise.resolve('ok')),
    ]);

    expect(results[0]).toEqual({ status: 'rejected', reason: new Error('fail') });
    expect(results[1]).toEqual({ status: 'fulfilled', value: 'ok' });
  });

  it('should default to 5 concurrent requests', async () => {
    const pool = createRequestPool();
    let maxConcurrent = 0;
    let active = 0;

    const task = () =>
      new Promise<void>((resolve) => {
        active++;
        maxConcurrent = Math.max(maxConcurrent, active);
        setTimeout(() => {
          active--;
          resolve();
        }, 10);
      });

    await Promise.all(Array.from({ length: 10 }, () => pool.enqueue(task)));
    expect(maxConcurrent).toBe(5);
  });
});

describe('getEarliestBenchmarkStartTime', () => {
  it('should return the earliest benchmark started_at', () => {
    const job = mockEvaluationJob();
    job.status.benchmarks = [
      // eslint-disable-next-line camelcase
      { id: 'b1', status: 'completed', started_at: '2026-01-01T10:05:00Z' },
      // eslint-disable-next-line camelcase
      { id: 'b2', status: 'running', started_at: '2026-01-01T10:00:00Z' },
    ];
    expect(getEarliestBenchmarkStartTime(job)).toBe('2026-01-01T10:00:00.000Z');
  });

  it('should return undefined when no benchmarks have started_at', () => {
    const job = mockEvaluationJob({ createdAt: '2026-01-01T09:00:00Z' });
    job.status.benchmarks = [{ id: 'b1', status: 'pending' }];
    expect(getEarliestBenchmarkStartTime(job)).toBeUndefined();
  });

  it('should return undefined when benchmarks array is empty', () => {
    const job = mockEvaluationJob({ createdAt: '2026-01-01T09:00:00Z' });
    job.status.benchmarks = [];
    expect(getEarliestBenchmarkStartTime(job)).toBeUndefined();
  });

  it('should return undefined when benchmarks is undefined', () => {
    const job = mockEvaluationJob({ createdAt: '2026-01-01T09:00:00Z' });
    job.status.benchmarks = undefined;
    expect(getEarliestBenchmarkStartTime(job)).toBeUndefined();
  });

  it('should return undefined when all started_at values are invalid', () => {
    const job = mockEvaluationJob({ createdAt: '2026-01-01T09:00:00Z' });
    // eslint-disable-next-line camelcase
    job.status.benchmarks = [{ id: 'b1', status: 'running', started_at: 'not-a-date' }];
    expect(getEarliestBenchmarkStartTime(job)).toBeUndefined();
  });
});

describe('getEarliestStartTime', () => {
  it('should return the earliest benchmark started_at', () => {
    const job = mockEvaluationJob();
    job.status.benchmarks = [
      // eslint-disable-next-line camelcase
      { id: 'b1', status: 'completed', started_at: '2026-01-01T10:05:00Z' },
      // eslint-disable-next-line camelcase
      { id: 'b2', status: 'running', started_at: '2026-01-01T10:00:00Z' },
      // eslint-disable-next-line camelcase
      { id: 'b3', status: 'completed', started_at: '2026-01-01T10:10:00Z' },
    ];
    expect(getEarliestStartTime(job)).toBe('2026-01-01T10:00:00.000Z');
  });

  it('should fall back to resource.created_at when no benchmarks have started_at', () => {
    const job = mockEvaluationJob({ createdAt: '2026-01-01T09:00:00Z' });
    job.status.benchmarks = [{ id: 'b1', status: 'pending' }];
    expect(getEarliestStartTime(job)).toBe('2026-01-01T09:00:00Z');
  });

  it('should fall back to resource.created_at when benchmarks array is empty', () => {
    const job = mockEvaluationJob({ createdAt: '2026-01-01T09:00:00Z' });
    job.status.benchmarks = [];
    expect(getEarliestStartTime(job)).toBe('2026-01-01T09:00:00Z');
  });

  it('should fall back to resource.created_at when benchmarks is undefined', () => {
    const job = mockEvaluationJob({ createdAt: '2026-01-01T09:00:00Z' });
    job.status.benchmarks = undefined;
    expect(getEarliestStartTime(job)).toBe('2026-01-01T09:00:00Z');
  });

  it('should skip benchmarks with invalid started_at', () => {
    const job = mockEvaluationJob();
    job.status.benchmarks = [
      // eslint-disable-next-line camelcase
      { id: 'b1', status: 'running', started_at: 'invalid-date' },
      // eslint-disable-next-line camelcase
      { id: 'b2', status: 'running', started_at: '2026-01-01T10:00:00Z' },
    ];
    expect(getEarliestStartTime(job)).toBe('2026-01-01T10:00:00.000Z');
  });
});

describe('formatElapsedTime', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should format hours and minutes', () => {
    expect(formatElapsedTime('2026-01-01T10:30:00Z')).toBe('1h 30m');
  });

  it('should format minutes only when under an hour', () => {
    expect(formatElapsedTime('2026-01-01T11:45:00Z')).toBe('15m');
  });

  it('should return "< 1m" when under a minute', () => {
    expect(formatElapsedTime('2026-01-01T11:59:30Z')).toBe('< 1m');
  });

  it('should return "< 1m" for future start time', () => {
    expect(formatElapsedTime('2026-01-01T13:00:00Z')).toBe('< 1m');
  });

  it('should show 0m with hours when exactly on the hour', () => {
    expect(formatElapsedTime('2026-01-01T10:00:00Z')).toBe('2h 0m');
  });
});

describe('isPreStartFailure', () => {
  it('should return true when state is failed and benchmarks array is empty', () => {
    const job = mockEvaluationJob({ state: 'failed', benchmarkStatuses: [] });
    expect(isPreStartFailure(job)).toBe(true);
  });

  it('should return true when state is failed and no benchmark has started_at or error_message', () => {
    const job = mockEvaluationJob({
      state: 'failed',
      benchmarkStatuses: [{ id: 'bm-a', benchmark_index: 0, status: 'failed' }],
    });
    expect(isPreStartFailure(job)).toBe(true);
  });

  it('should return false when a benchmark has started_at — runtime failure', () => {
    const job = mockEvaluationJob({
      state: 'failed',
      benchmarkStatuses: [
        { id: 'bm-a', benchmark_index: 0, status: 'failed', started_at: '2026-01-01T10:00:00Z' },
      ],
    });
    expect(isPreStartFailure(job)).toBe(false);
  });

  it('should return false when a benchmark has error_message but no started_at — runner reached the benchmark', () => {
    const job = mockEvaluationJob({
      state: 'failed',
      benchmarkStatuses: [
        {
          id: 'bm-a',
          benchmark_index: 0,
          status: 'failed',
          error_message: { message: 'granite-7b is not a valid model identifier' },
        },
      ],
    });
    expect(isPreStartFailure(job)).toBe(false);
  });

  it('should return false when a benchmark has warning_message but no started_at — runner produced output', () => {
    const job = mockEvaluationJob({
      state: 'failed',
      benchmarkStatuses: [
        {
          id: 'bm-a',
          benchmark_index: 0,
          status: 'failed',
          warning_message: { message: 'High memory usage' },
        },
      ],
    });
    expect(isPreStartFailure(job)).toBe(false);
  });

  it('should return false when state is not failed', () => {
    const job = mockEvaluationJob({ state: 'running', benchmarkStatuses: [] });
    expect(isPreStartFailure(job)).toBe(false);
  });

  it('should return false for completed jobs regardless of benchmark data', () => {
    const job = mockEvaluationJob({ state: 'completed', benchmarkStatuses: [] });
    expect(isPreStartFailure(job)).toBe(false);
  });
});
