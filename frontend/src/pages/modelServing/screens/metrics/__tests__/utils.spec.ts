import {
  convertInputType,
  toPercentage,
  per100,
} from '#~/pages/modelServing/screens/metrics/utils';

describe('convertInputType', () => {
  describe('string inputs', () => {
    it('should return empty string for empty input', () => {
      expect(convertInputType('')).toBe('');
    });
    it('should return original string for non-convertible string input', () => {
      expect(convertInputType('hello')).toBe('hello');
      expect(convertInputType('test123test')).toBe('test123test');
    });
  });
  describe('number inputs', () => {
    it('should convert string numbers to actual numbers', () => {
      expect(convertInputType('123')).toBe(123);
      expect(convertInputType('1.23')).toBe(1.23);
      expect(convertInputType('-123')).toBe(-123);
      expect(convertInputType('0')).toBe(0);
    });
    it('should handle number input directly', () => {
      expect(convertInputType(123)).toBe(123);
      expect(convertInputType(-123)).toBe(-123);
      expect(convertInputType(1.23)).toBe(1.23);
    });
  });
  describe('boolean inputs', () => {
    it('should convert string booleans to actual booleans', () => {
      expect(convertInputType('true')).toBe(true);
      expect(convertInputType('false')).toBe(false);
      expect(convertInputType('TRUE')).toBe(true);
      expect(convertInputType('FALSE')).toBe(false);
    });
    it('should handle boolean input directly', () => {
      expect(convertInputType(true)).toBe(true);
      expect(convertInputType(false)).toBe(false);
    });
    it('should handle mixed case boolean input', () => {
      expect(convertInputType('True')).toBe(true);
      expect(convertInputType('faLse')).toBe(false);
    });
  });
});

describe('toPercentage', () => {
  it('should round percentage values to 2 decimal places', () => {
    const input = { x: 1000, y: 0.09896161479334678, name: 'test' };
    const result = toPercentage(input);
    expect(result.y).toBe(9.9);
  });

  it('should handle values that round up', () => {
    const input = { x: 1000, y: Number('0.15228456789012345'), name: 'test' };
    const result = toPercentage(input);
    expect(result.y).toBe(15.23);
  });

  it('should handle values that round down', () => {
    const input = { x: 1000, y: 0.15224, name: 'test' };
    const result = toPercentage(input);
    expect(result.y).toBe(15.22);
  });

  it('should handle edge case near 100%', () => {
    const input = { x: 1000, y: 0.999999, name: 'test' };
    const result = toPercentage(input);
    expect(result.y).toBe(100);
  });

  it('should handle edge case near 0%', () => {
    const input = { x: 1000, y: 0.005, name: 'test' };
    const result = toPercentage(input);
    expect(result.y).toBe(0.5);
  });

  it('should handle exact zero', () => {
    const input = { x: 1000, y: 0, name: 'test' };
    const result = toPercentage(input);
    expect(result.y).toBe(0);
  });

  it('should preserve x and name properties', () => {
    const input = { x: 12345, y: 0.5, name: 'Memory Usage' };
    const result = toPercentage(input);
    expect(result.x).toBe(12345);
    expect(result.name).toBe('Memory Usage');
  });

  it('should handle floating-point precision artifacts', () => {
    // Test that floating-point errors like 99.99999999999999 get properly rounded
    const input = { x: 1000, y: 0.9999999999999999, name: 'test' };
    const result = toPercentage(input);
    expect(result.y).toBe(100);
  });
});

describe('per100', () => {
  it('should divide by 100 and round to 2 decimal places', () => {
    const input = { x: 1000, y: 989.6161479334678, name: 'test' };
    const result = per100(input);
    expect(result.y).toBe(9.9);
  });

  it('should handle values that round up', () => {
    const input = { x: 1000, y: Number('1522.8456789012345'), name: 'test' };
    const result = per100(input);
    expect(result.y).toBe(15.23);
  });

  it('should handle exact zero', () => {
    const input = { x: 1000, y: 0, name: 'test' };
    const result = per100(input);
    expect(result.y).toBe(0);
  });

  it('should preserve x and name properties', () => {
    const input = { x: 12345, y: 5000, name: 'CPU Usage' };
    const result = per100(input);
    expect(result.x).toBe(12345);
    expect(result.name).toBe('CPU Usage');
  });
});
