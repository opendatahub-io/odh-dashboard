import { extractNumberAndTimeUnit } from '#~/concepts/pipelines/content/createRun/contentSections/utils';

describe('extractNumberAndTimeUnit', () => {
  test('splits valid numeric and unit parts', () => {
    expect(extractNumberAndTimeUnit('1555Days')).toEqual([1555, 'Days']);
    expect(extractNumberAndTimeUnit('1.23e+21Week')).toEqual([1.23e21, 'Week']);
    expect(extractNumberAndTimeUnit('1.2342342342342342e+32Week')).toEqual([
      1.2342342342342342e32,
      'Week',
    ]);
  });

  test('handles missing numeric part', () => {
    expect(extractNumberAndTimeUnit('Day')).toEqual([1, 'Day']);
    expect(extractNumberAndTimeUnit('Minute')).toEqual([1, 'Minute']);
  });

  test('handles edge cases', () => {
    expect(extractNumberAndTimeUnit('')).toEqual([1, '']);
    expect(extractNumberAndTimeUnit('InfinityYear')).toEqual([1, 'InfinityYear']);
    expect(extractNumberAndTimeUnit('-InfinityWeek')).toEqual([1, '-InfinityWeek']);
  });

  test('trims whitespace', () => {
    expect(extractNumberAndTimeUnit('  123Day  ')).toEqual([123, 'Day']);
    expect(extractNumberAndTimeUnit('  Day  ')).toEqual([1, 'Day']);
  });
});
