import {
  UnitOption,
  splitValueUnit,
  isCpuLimitEqual,
  isMemoryLimitEqual,
  isCpuLimitLarger,
  isMemoryLimitLarger,
  isLarger,
  convertToUnit,
  MEMORY_UNITS_FOR_PARSING,
} from '~/utilities/valueUnits';

describe('splitValueUnit', () => {
  const options: UnitOption[] = [
    {
      name: 'name',
      unit: 'unit',
      weight: 1,
    },
  ];
  it('should default back to base if unable to match a legit value', () => {
    expect(splitValueUnit('', options)).toEqual([1, options[0]]);
  });
  it('should return the value and unit', () => {
    expect(splitValueUnit('1unit', options)).toEqual([1, options[0]]);
    expect(splitValueUnit('1name', options)).toEqual([1, options[0]]);
    expect(splitValueUnit('1', options)).toEqual([1, options[0]]);
    expect(splitValueUnit('1.5unit', options)).toEqual([1.5, options[0]]);
    expect(splitValueUnit('1.5name', options)).toEqual([1.5, options[0]]);
    expect(splitValueUnit('1.5', options)).toEqual([1.5, options[0]]);
  });
});

describe('convertToUnit', () => {
  const options = MEMORY_UNITS_FOR_PARSING;
  it('should correctly convert a number without units', () => {
    expect(convertToUnit('42493440', options, 'Gi')).toEqual([
      0.03957509994506836,
      { name: 'GiB', unit: 'Gi', weight: 1024 ** 3 },
    ]);
  });
  it('should correctly convert a number with units to a higher unit', () => {
    expect(convertToUnit('500Mi', options, 'Gi')).toEqual([
      0.48828125,
      { name: 'GiB', unit: 'Gi', weight: 1024 ** 3 },
    ]);
  });
  it('should correctly convert a number with units to the base unit', () => {
    expect(convertToUnit('500Mi', options, '')).toEqual([
      524288000,
      { name: 'B', unit: '', weight: 1 },
    ]);
  });
  it('should fall back to the parsed unit when target unit is invalid', () => {
    expect(convertToUnit('500Mi', options, 'bogus')).toEqual([
      500,
      { name: 'MiB', unit: 'Mi', weight: 1024 ** 2 },
    ]);
  });
  it('should fall back to the parsed unit when there is no weight-1 unit', () => {
    expect(convertToUnit('500Mi', options.slice(0, -1), 'Gi')).toEqual([
      500,
      { name: 'MiB', unit: 'Mi', weight: 1024 ** 2 },
    ]);
  });
});

describe('isLarger', () => {
  const unit: UnitOption[] = [
    {
      name: 'name',
      unit: 'lg',
      weight: 100,
    },
    {
      name: 'name',
      unit: 'sm',
      weight: 1,
    },
  ];
  it('should return true if when value1 is larger than value2', () => {
    expect(isLarger('1000lg', '10sm', unit)).toBe(true);
  });
  it('should return false if when value1 is smaller than value2', () => {
    expect(isLarger('10sm', '1000lg', unit)).toBe(false);
  });
  it('should return false if not equal, but of the same numeric value', () => {
    expect(isLarger('10sm', '10lg', unit)).toBe(false);
  });
  it('should return false if when value1 is equal to value2', () => {
    expect(isLarger('10sm', '10sm', unit)).toBe(false);
  });
  it('should return false if when value1 is undefined', () => {
    expect(isLarger('', '10lg', unit)).toBe(false);
  });
  it('should return false if when value2 is undefined', () => {
    expect(isLarger('10sm', '', unit)).toBe(false);
  });
  it('should return false if when value1 and value2 are undefined', () => {
    expect(isLarger('', '', unit)).toBe(false);
  });
});

describe('isCpuLimitLarger', () => {
  it('should return false if both values are undefined', () => {
    expect(isCpuLimitLarger(undefined, undefined)).toBe(false);
  });
  it('should return false if the first value is undefined', () => {
    expect(isCpuLimitLarger(undefined, '1000m')).toBe(false);
  });
  it('should return false if the second value is undefined', () => {
    expect(isCpuLimitLarger('1000m', undefined)).toBe(false);
  });
  it('should return false if the first value is not larger', () => {
    expect(isCpuLimitLarger('1000m', '1000m')).toBe(false);
  });
  it('should return false if the first value is larger', () => {
    expect(isCpuLimitLarger('1001m', '1000m')).toBe(false);
  });
  it('should return false if the first value is larger and the second value is a number', () => {
    expect(isCpuLimitLarger('2', '1000m')).toBe(false);
  });
  it('should return false if the first value is larger and the second value is a number', () => {
    expect(isCpuLimitLarger('2', '1000m')).toBe(false);
  });
  it('should return true if the first value is larger and the second value is a number', () => {
    expect(isCpuLimitLarger('2', 1000)).toBe(true);
  });
});

describe('isCpuLimitEqual', () => {
  test('correctly compares non-undefined values', () => {
    expect(isCpuLimitEqual('1', '1')).toBe(true);
    expect(isCpuLimitEqual(1, '1')).toBe(true);
    expect(isCpuLimitEqual('1000m', '1')).toBe(true);
    expect(isCpuLimitEqual('1000m', 1)).toBe(true);
    expect(isCpuLimitEqual('1001m', '1')).toBe(false);
  });
  test('correctly compares undefined values', () => {
    expect(isCpuLimitEqual('1000m', undefined)).toBe(false);
    expect(isCpuLimitEqual('1', undefined)).toBe(false);
    expect(isCpuLimitEqual(1, undefined)).toBe(false);
    expect(isCpuLimitEqual(undefined, undefined)).toBe(true);
  });
});

describe('isMemoryLimitEqual', () => {
  test('correctly compares non-undefined values', () => {
    expect(isMemoryLimitEqual('1Gi', '1Gi')).toBe(true);
    expect(isMemoryLimitEqual('1Gi', '1024Mi')).toBe(true);
    expect(isMemoryLimitEqual('1Gi', '1025Mi')).toBe(false);
  });
  test('correctly compares undefined values', () => {
    expect(isMemoryLimitEqual('1Gi', undefined)).toBe(false);
    expect(isMemoryLimitEqual('1024Mi', undefined)).toBe(false);
    expect(isMemoryLimitEqual(undefined, undefined)).toBe(true);
  });
});

describe('isCpuLimitLarger', () => {
  test('correctly compares non-undefined values', () => {
    expect(isCpuLimitLarger('1', '1')).toBe(false);
    expect(isCpuLimitLarger('1', '1', true)).toBe(true);
    expect(isCpuLimitLarger(1, '1')).toBe(false);
    expect(isCpuLimitLarger(1, '1', true)).toBe(true);
    expect(isCpuLimitLarger('1000m', '1')).toBe(false);
    expect(isCpuLimitLarger('1000m', '1', true)).toBe(true);
    expect(isCpuLimitLarger('1', '1001m')).toBe(true);
  });
  test('correctly compares undefined values', () => {
    expect(isCpuLimitLarger(undefined, '1000m')).toBe(false);
    expect(isCpuLimitLarger('1000m', undefined)).toBe(false);
    expect(isCpuLimitLarger(1, undefined)).toBe(false);
    expect(isCpuLimitLarger(undefined, undefined)).toBe(false);
  });
});

describe('isMemoryLimitLarger', () => {
  test('correctly compares non-undefined values', () => {
    expect(isMemoryLimitLarger('1Gi', '1Gi')).toBe(false);
    expect(isMemoryLimitLarger('1Gi', '1Gi', true)).toBe(true);
    expect(isMemoryLimitLarger('1Gi', '1024Mi')).toBe(false);
    expect(isMemoryLimitLarger('1Gi', '1024Mi', true)).toBe(true);
    expect(isMemoryLimitLarger('1Gi', '1025Mi')).toBe(true);
  });
  test('correctly compares undefined values', () => {
    expect(isMemoryLimitLarger(undefined, '1Gi')).toBe(false);
    expect(isMemoryLimitLarger('1Gi', undefined)).toBe(false);
    expect(isMemoryLimitLarger(undefined, undefined)).toBe(false);
  });
});
