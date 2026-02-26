import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import {
  getEvaluationName,
  getBenchmarkName,
  getResultDisplay,
  formatDate,
} from '../evaluationUtils';

describe('getEvaluationName', () => {
  it('should return tenant when available', () => {
    const job = mockEvaluationJob({ tenant: 'My Evaluation' });
    expect(getEvaluationName(job)).toBe('My Evaluation');
  });

  it('should return resource id when tenant is not set', () => {
    const job = mockEvaluationJob({ id: 'eval-123' });
    expect(getEvaluationName(job)).toBe('eval-123');
  });

  it('should return resource id when tenant is empty string', () => {
    const job = mockEvaluationJob({ id: 'eval-456', tenant: '' });
    expect(getEvaluationName(job)).toBe('eval-456');
  });
});

describe('getBenchmarkName', () => {
  it('should return the first benchmark id', () => {
    const job = mockEvaluationJob({ benchmarkId: 'MMLU Finance' });
    expect(getBenchmarkName(job)).toBe('MMLU Finance');
  });

  it('should return dash when there are no benchmarks', () => {
    const job = mockEvaluationJob();
    job.benchmarks = [];
    expect(getBenchmarkName(job)).toBe('-');
  });
});

describe('getResultDisplay', () => {
  it('should return percentage for a job with metrics', () => {
    const job = mockEvaluationJob({ metrics: { score: 0.85 } });
    expect(getResultDisplay(job)).toBe('85%');
  });

  it('should round down fractional percentages', () => {
    const job = mockEvaluationJob({ metrics: { accuracy: 0.466 } });
    expect(getResultDisplay(job)).toBe('47%');
  });

  it('should return dash when results has no benchmarks', () => {
    const job = mockEvaluationJob();
    expect(getResultDisplay(job)).toBe('-');
  });

  it('should return dash when benchmarks have no metrics', () => {
    const job = mockEvaluationJob();
    // eslint-disable-next-line camelcase
    job.results = { total_evaluations: 1, benchmarks: [{ id: 'b1' }] };
    expect(getResultDisplay(job)).toBe('-');
  });

  it('should return dash when metrics object is empty', () => {
    const job = mockEvaluationJob();
    // eslint-disable-next-line camelcase
    job.results = { total_evaluations: 1, benchmarks: [{ id: 'b1', metrics: {} }] };
    expect(getResultDisplay(job)).toBe('-');
  });

  it('should handle 0% result', () => {
    const job = mockEvaluationJob({ metrics: { score: 0 } });
    expect(getResultDisplay(job)).toBe('0%');
  });

  it('should handle 100% result', () => {
    const job = mockEvaluationJob({ metrics: { score: 1.0 } });
    expect(getResultDisplay(job)).toBe('100%');
  });
});

describe('formatDate', () => {
  it('should return dash for undefined input', () => {
    expect(formatDate(undefined)).toBe('-');
  });

  it('should return dash for empty string', () => {
    expect(formatDate('')).toBe('-');
  });

  it('should format a valid ISO date string', () => {
    const result = formatDate('2026-02-20T10:00:00Z');
    expect(result).toBeTruthy();
    expect(result).not.toBe('-');
    expect(result).toContain('2026');
    expect(result).toContain('Feb');
  });

  it('should return the original string for an invalid date', () => {
    const result = formatDate('not-a-date');
    expect(typeof result).toBe('string');
  });
});
