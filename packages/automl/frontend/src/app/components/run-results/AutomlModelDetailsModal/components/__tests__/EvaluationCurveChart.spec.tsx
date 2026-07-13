import '@testing-library/jest-dom';
import { findYAtX } from '~/app/components/run-results/AutomlModelDetailsModal/components/EvaluationCurveChart';
import type { CurvePoint } from '~/app/components/run-results/AutomlModelDetailsModal/components/EvaluationCurveChart';

const makePoint = (x: number, y: number): CurvePoint => ({ name: 'test', x, y, index: 0 });

describe('findYAtX', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return first y when targetX is before all points', () => {
    const points = [makePoint(0.2, 0.5), makePoint(0.5, 0.8), makePoint(1.0, 1.0)];
    expect(findYAtX(points, 0.0)).toBe(0.5);
  });

  it('should return last y when targetX is after all points', () => {
    const points = [makePoint(0.0, 0.0), makePoint(0.5, 0.8)];
    expect(findYAtX(points, 1.0)).toBe(0.8);
  });

  it('should return exact y when targetX matches a point', () => {
    const points = [makePoint(0.0, 0.0), makePoint(0.5, 0.7), makePoint(1.0, 1.0)];
    expect(findYAtX(points, 0.5)).toBe(0.7);
  });

  it('should linearly interpolate between two bracketing points', () => {
    const points = [makePoint(0.0, 0.0), makePoint(1.0, 1.0)];
    expect(findYAtX(points, 0.5)).toBeCloseTo(0.5, 10);
  });

  it('should interpolate correctly at non-trivial midpoints', () => {
    const points = [makePoint(0.0, 0.0), makePoint(0.4, 0.8), makePoint(1.0, 1.0)];
    // Between (0.0, 0.0) and (0.4, 0.8), at x=0.2: t = 0.2/0.4 = 0.5, y = 0 + 0.5*0.8 = 0.4
    expect(findYAtX(points, 0.2)).toBeCloseTo(0.4, 10);
  });

  it('should handle unsorted input by sorting first', () => {
    const points = [makePoint(1.0, 1.0), makePoint(0.0, 0.0), makePoint(0.5, 0.8)];
    expect(findYAtX(points, 0.25)).toBeCloseTo(0.4, 10);
  });

  it('should handle zero-range between identical x values', () => {
    const points = [
      makePoint(0.0, 0.0),
      makePoint(0.5, 0.3),
      makePoint(0.5, 0.7),
      makePoint(1.0, 1.0),
    ];
    // When range is 0, t = 0, so returns the y of the earlier point
    expect(findYAtX(points, 0.5)).toBe(0.3);
  });

  it('should return the single y for a single-point array', () => {
    const points = [makePoint(0.5, 0.9)];
    expect(findYAtX(points, 0.0)).toBe(0.9);
    expect(findYAtX(points, 0.5)).toBe(0.9);
    expect(findYAtX(points, 1.0)).toBe(0.9);
  });
});
