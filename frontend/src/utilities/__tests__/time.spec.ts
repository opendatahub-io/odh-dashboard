import { convertPeriodicTimeToSeconds, convertSecondsToPeriodicTime } from '~/utilities/time';

describe('Convert periodic time to seconds', () => {
  it('should convert hours to seconds', () => {
    expect(convertPeriodicTimeToSeconds('5Hour')).toBe(5 * 60 * 60);
  });

  it('should convert minutes to seconds', () => {
    expect(convertPeriodicTimeToSeconds('6Minute')).toBe(6 * 60);
  });

  it('should convert days to seconds', () => {
    expect(convertPeriodicTimeToSeconds('221Day')).toBe(221 * 24 * 60 * 60);
  });

  it('should convert weeks to seconds', () => {
    expect(convertPeriodicTimeToSeconds('12Week')).toBe(12 * 7 * 24 * 60 * 60);
  });

  it('should default to 0 seconds for unrecognized units', () => {
    expect(convertPeriodicTimeToSeconds('3Weeks')).toBe(0);
  });
});

describe('Convert seconds to periodic time', () => {
  it('should convert seconds to minutes', () => {
    expect(convertSecondsToPeriodicTime(120)).toBe('2Minute');
  });

  it('should convert seconds to hours', () => {
    expect(convertSecondsToPeriodicTime(7200)).toBe('2Hour');
  });

  it('should convert seconds to days', () => {
    expect(convertSecondsToPeriodicTime(172800)).toBe('2Day');
  });

  it('should convert seconds to weeks', () => {
    expect(convertSecondsToPeriodicTime(604800)).toBe('1Week');
  });
});
