import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import {
  getEvaluationName,
  getBenchmarkName,
  getResultScore,
  formatDate,
} from '~/app/utilities/evaluationUtils';

describe('getEvaluationName', () => {
  it('should return name when available', () => {
    const job = mockEvaluationJob({ name: 'My Evaluation' });
    expect(getEvaluationName(job)).toBe('My Evaluation');
  });

  it('should fall back to tenant when name is not set', () => {
    const job = mockEvaluationJob({ tenant: 'Tenant Name' });
    expect(getEvaluationName(job)).toBe('Tenant Name');
  });

  it('should fall back to resource id when neither name nor tenant is set', () => {
    const job = mockEvaluationJob({ id: 'eval-123' });
    expect(getEvaluationName(job)).toBe('eval-123');
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

describe('getResultScore', () => {
  it('should return percentage from top-level test score', () => {
    const job = mockEvaluationJob({ score: 0.85 });
    expect(getResultScore(job)).toBe('85%');
  });

  it('should round fractional percentages to nearest integer', () => {
    const job = mockEvaluationJob({ score: 0.466 });
    expect(getResultScore(job)).toBe('47%');
  });

  it('should fall back to benchmark test primary_score when top-level test is absent', () => {
    const job = mockEvaluationJob();
    // eslint-disable-next-line camelcase
    job.results = { benchmarks: [{ id: 'b1', test: { primary_score: 0.72 } }] };
    expect(getResultScore(job)).toBe('72%');
  });

  it('should return dash when results has no benchmarks and no test', () => {
    const job = mockEvaluationJob();
    job.results = {};
    expect(getResultScore(job)).toBe('-');
  });

  it('should fall back to metrics when test fields are absent', () => {
    const job = mockEvaluationJob();
    job.results = { benchmarks: [{ id: 'b1', metrics: { acc: 0.85 } }] };
    expect(getResultScore(job)).toBe('85%');
  });

  it('should return dash when benchmarks have no test and no metrics', () => {
    const job = mockEvaluationJob();
    job.results = { benchmarks: [{ id: 'b1' }] };
    expect(getResultScore(job)).toBe('-');
  });

  it('should handle 0% result', () => {
    const job = mockEvaluationJob({ score: 0 });
    expect(getResultScore(job)).toBe('0%');
  });

  it('should handle 100% result', () => {
    const job = mockEvaluationJob({ score: 1.0 });
    expect(getResultScore(job)).toBe('100%');
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
    expect(result).toContain('02');
  });

  it('should return the original string for an invalid date', () => {
    const result = formatDate('not-a-date');
    expect(typeof result).toBe('string');
  });
});
