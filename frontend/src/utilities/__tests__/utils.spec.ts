import { asEnumMember, isEnumMember } from '~/utilities/utils';

describe('asEnumMember', () => {
  enum Test {
    first = 1,
    second = 2,
  }
  it('should return enum member', () => {
    expect(asEnumMember(1, Test)).toBe(Test.first);
    expect(asEnumMember(2, Test)).toBe(Test.second);
    expect(asEnumMember(3, Test)).toBe(null);
    expect(asEnumMember('first', Test)).toBe(null);
    expect(asEnumMember('second', Test)).toBe(null);
    expect(asEnumMember(null, Test)).toBe(null);
  });
});

describe('isEnumMember', () => {
  enum Test {
    first = 1,
    second = 2,
  }
  it('should identify enum member', () => {
    expect(isEnumMember(1, Test)).toBe(true);
    expect(isEnumMember(2, Test)).toBe(true);
    expect(isEnumMember(3, Test)).toBe(false);
    expect(isEnumMember('first', Test)).toBe(false);
    expect(isEnumMember('second', Test)).toBe(false);
    expect(isEnumMember(null, Test)).toBe(false);
  });
});
