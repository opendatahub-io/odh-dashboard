import { toTitleCase, capitalizeFirst, getCategoryColor } from '~/app/components/benchmarkUtils';

describe('toTitleCase', () => {
  it('should return empty string unchanged', () => {
    expect(toTitleCase('')).toBe('');
  });

  it('should capitalize the first letter of each word', () => {
    expect(toTitleCase('hello world')).toBe('Hello World');
    expect(toTitleCase('prompt injection')).toBe('Prompt Injection');
  });

  it('should preserve all-caps words (acronyms)', () => {
    expect(toTitleCase('NLP safety')).toBe('NLP Safety');
    expect(toTitleCase('DAN attack')).toBe('DAN Attack');
    expect(toTitleCase('BBQ benchmark')).toBe('BBQ Benchmark');
  });

  it('should handle single-word input', () => {
    expect(toTitleCase('hello')).toBe('Hello');
    expect(toTitleCase('NLP')).toBe('NLP');
  });

  it('should handle mixed case input', () => {
    expect(toTitleCase('mcdonald analysis')).toBe('Mcdonald Analysis');
    expect(toTitleCase('HELLO WORLD')).toBe('HELLO WORLD');
  });

  it('should handle single character words', () => {
    expect(toTitleCase('a b c')).toBe('A B C');
  });

  it('should handle already title-cased input', () => {
    expect(toTitleCase('Already Title Case')).toBe('Already Title Case');
  });

  it('should return falsy values unchanged', () => {
    // @ts-expect-error testing runtime guard with non-string input
    expect(toTitleCase(undefined)).toBeUndefined();
    // @ts-expect-error testing runtime guard with non-string input
    expect(toTitleCase(null)).toBeNull();
  });
});

describe('capitalizeFirst', () => {
  it('should capitalize the first character only', () => {
    expect(capitalizeFirst('hello')).toBe('Hello');
    expect(capitalizeFirst('hello world')).toBe('Hello world');
  });

  it('should not change already capitalized strings', () => {
    expect(capitalizeFirst('Hello')).toBe('Hello');
  });
});

describe('getCategoryColor', () => {
  it('should return blue for undefined category', () => {
    expect(getCategoryColor(undefined)).toBe('blue');
  });

  it('should return blue for empty string', () => {
    expect(getCategoryColor('')).toBe('blue');
  });

  it('should return a consistent color for the same category', () => {
    const color = getCategoryColor('safety');
    expect(getCategoryColor('safety')).toBe(color);
  });

  it('should be case-insensitive', () => {
    expect(getCategoryColor('Safety')).toBe(getCategoryColor('safety'));
  });
});
