import { asEnumMember, enumIterator, isEnumMember, safeExecute } from '#~/utilities/utils';

enum Test {
  first = '1st',
  second = '2nd',
}

enum TestMixed {
  first = 1,
  second = '2nd',
  third = '3rd',
}

enum TestNumeric {
  first,
  second,
}

describe('asEnumMember', () => {
  it('should return enum member for string enums', () => {
    expect(asEnumMember('1st', Test)).toBe(Test.first);
    expect(asEnumMember('2nd', Test)).toBe(Test.second);
    expect(asEnumMember(1, Test)).toBe(null);
    expect(asEnumMember('first', Test)).toBe(null);
    expect(asEnumMember('second', Test)).toBe(null);
    expect(asEnumMember('unknown', Test)).toBe(null);
    expect(asEnumMember(null, Test)).toBe(null);
  });

  it('should return enum member for mixed enums', () => {
    expect(asEnumMember(1, TestMixed)).toBe(TestMixed.first);
    expect(asEnumMember('2nd', TestMixed)).toBe(TestMixed.second);
    expect(asEnumMember('3rd', TestMixed)).toBe(TestMixed.third);
    expect(asEnumMember('1', TestMixed)).toBe(null);
    expect(asEnumMember(2, TestMixed)).toBe(null);
    expect(asEnumMember('first', TestMixed)).toBe(null);
    expect(asEnumMember('second', TestMixed)).toBe(null);
    expect(asEnumMember('third', TestMixed)).toBe(null);
    expect(asEnumMember('unknown', TestMixed)).toBe(null);
    expect(asEnumMember(null, TestMixed)).toBe(null);
  });

  it('should return enum member for numeric enums', () => {
    expect(asEnumMember(0, TestNumeric)).toBe(TestNumeric.first);
    expect(asEnumMember(1, TestNumeric)).toBe(TestNumeric.second);
    expect(asEnumMember('1', TestNumeric)).toBe(null);
    expect(asEnumMember(2, TestNumeric)).toBe(null);
    expect(asEnumMember('first', TestNumeric)).toBe(null);
    expect(asEnumMember('second', TestNumeric)).toBe(null);
    expect(asEnumMember('unknown', TestNumeric)).toBe(null);
    expect(asEnumMember(null, TestNumeric)).toBe(null);
  });
});

describe('isEnumMember', () => {
  it('should return enum member for string enums', () => {
    expect(isEnumMember('1st', Test)).toBe(true);
    expect(isEnumMember('2nd', Test)).toBe(true);
    expect(isEnumMember(1, Test)).toBe(false);
    expect(isEnumMember('first', Test)).toBe(false);
    expect(isEnumMember('second', Test)).toBe(false);
    expect(isEnumMember('unknown', Test)).toBe(false);
    expect(isEnumMember(null, Test)).toBe(false);
  });

  it('should identify enum member for mixed enums', () => {
    expect(isEnumMember(1, TestMixed)).toBe(true);
    expect(isEnumMember('2nd', TestMixed)).toBe(true);
    expect(isEnumMember('3rd', TestMixed)).toBe(true);
    expect(isEnumMember('1', TestMixed)).toBe(false);
    expect(isEnumMember(2, TestMixed)).toBe(false);
    expect(isEnumMember('first', TestMixed)).toBe(false);
    expect(isEnumMember('second', TestMixed)).toBe(false);
    expect(isEnumMember('third', TestMixed)).toBe(false);
    expect(isEnumMember('unknown', TestMixed)).toBe(false);
    expect(isEnumMember(null, TestMixed)).toBe(false);
  });

  it('should identify enum member for numeric enums', () => {
    expect(isEnumMember(0, TestNumeric)).toBe(true);
    expect(isEnumMember(1, TestNumeric)).toBe(true);
    expect(isEnumMember('1', TestNumeric)).toBe(false);
    expect(isEnumMember(2, TestNumeric)).toBe(false);
    expect(isEnumMember('first', TestNumeric)).toBe(false);
    expect(isEnumMember('second', TestNumeric)).toBe(false);
    expect(isEnumMember('unknown', TestNumeric)).toBe(false);
    expect(isEnumMember(null, TestNumeric)).toBe(false);
  });
});

describe('enumIterator', () => {
  it('should iterate over enum values', () => {
    expect(enumIterator(Test)).toEqual([
      ['first', '1st'],
      ['second', '2nd'],
    ]);
    expect(enumIterator(TestMixed)).toEqual([
      ['first', 1],
      ['second', '2nd'],
      ['third', '3rd'],
    ]);
    expect(enumIterator(TestNumeric)).toEqual([
      ['first', 0],
      ['second', 1],
    ]);
  });
});

describe('safeExecute', () => {
  it('should return function result when successful', () => {
    const result = safeExecute('test', 'test-link', () => 'success', 'default');
    expect(result).toBe('success');
  });

  it('should return default value when function throws', () => {
    const result = safeExecute(
      'test',
      'test-link',
      () => {
        throw new Error('test error');
      },
      'default',
    );
    expect(result).toBe('default');
  });

  it('should log error when function throws', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    safeExecute(
      'test explanation',
      'test-link',
      () => {
        throw new Error('test error');
      },
      'default',
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      'Development safety wrapper used: test explanation tracking removal in test-link',
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });
});
