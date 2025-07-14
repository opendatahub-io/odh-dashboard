import { convertInputType } from '#~/pages/modelServing/screens/metrics/utils';

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
