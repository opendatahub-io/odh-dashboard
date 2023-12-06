import { replaceNonNumericPartWithString, replaceNumericPartWithString } from '~/utilities/string';

describe('replaceNumericPartWithString', () => {
  it('should replace the numeric part of a string with a number', () => {
    expect(replaceNumericPartWithString('abc123xyz', 456)).toBe('abc456xyz');
  });

  it('should handle empty input string', () => {
    expect(replaceNumericPartWithString('', 789)).toBe('789');
  });

  it('should handle input string without numeric part', () => {
    expect(replaceNumericPartWithString('abcdef', 123)).toBe('123abcdef');
  });

  it('should handle numeric part at the beginning of the string', () => {
    expect(replaceNumericPartWithString('123xyz', 789)).toBe('789xyz');
  });

  it('should handle numeric part at the end of the string', () => {
    expect(replaceNumericPartWithString('abc456', 123)).toBe('abc123');
  });

  it('should handle Pipeline scheduled time', () => {
    expect(replaceNumericPartWithString('123Hour', 43424)).toBe('43424Hour');
  });

  it('should handle default Pipeline scheduled time', () => {
    expect(replaceNumericPartWithString('1Week', 26)).toBe('26Week');
  });
});

describe('replaceNonNumericPartWithString', () => {
  it('should replace the non-numeric part of a string with another string', () => {
    expect(replaceNonNumericPartWithString('abc123xyz', 'XYZ')).toBe('XYZ123xyz');
  });

  it('should handle empty input string', () => {
    expect(replaceNonNumericPartWithString('', 'XYZ')).toBe('XYZ');
  });

  it('should handle input string with no non-numeric part', () => {
    expect(replaceNonNumericPartWithString('123', 'XYZ')).toBe('123XYZ');
  });

  it('should handle input string with only non-numeric part', () => {
    expect(replaceNonNumericPartWithString('abc', 'XYZ')).toBe('XYZ');
  });

  it('should handle input string with multiple non-numeric parts', () => {
    expect(replaceNonNumericPartWithString('abc123def456', 'XYZ')).toBe('XYZ123def456');
  });

  it('should handle replacement string containing numbers', () => {
    expect(replaceNonNumericPartWithString('abc123xyz', '123')).toBe('123123xyz');
  });

  it('should handle replacement string containing special characters', () => {
    expect(replaceNonNumericPartWithString('abc123xyz', '@#$')).toBe('@#$123xyz');
  });

  it('should handle replacement string containing spaces', () => {
    expect(replaceNonNumericPartWithString('abc123xyz', '   ')).toBe('   123xyz');
  });

  it('should handle Pipeline scheduled time', () => {
    expect(replaceNonNumericPartWithString('123Week', 'Minute')).toBe('123Minute');
  });

  it('should handle default Pipeline scheduled time', () => {
    expect(replaceNonNumericPartWithString('1Week', 'Minute')).toBe('1Minute');
  });
});
