import { RunDateTime } from '#~/concepts/pipelines/content/createRun/types';
import {
  convertPeriodicTimeToSeconds,
  convertSecondsToPeriodicTime,
  relativeDuration,
  convertDateToSimpleDateString,
  convertDateToTimeString,
  ensureTimeFormat,
  printSeconds,
  relativeTime,
  convertToTwentyFourHourTime,
  convertToDate,
} from '#~/utilities/time';

describe('relativeDuration', () => {
  it('should convert milliseconds to minutes and seconds', () => {
    expect(relativeDuration(123456)).toBe('2 minutes, 3 seconds');
  });

  it('should calculate values if minutes is less than 0', () => {
    expect(relativeDuration(-123456)).toBe('-124 seconds');
  });
});

describe('convertDateToSimpleDateString', () => {
  it('should convert date to simple date string', () => {
    const date = new Date('2021-01-01');
    expect(convertDateToSimpleDateString(date)).toBe('2021-01-01');
  });

  it('should convert date and time to simple string', () => {
    const dateTime = new Date('2021-01-01T15:30:00');
    expect(convertDateToSimpleDateString(dateTime)).toBe('2021-01-01');
  });

  it('should return null if the date is not equal', () => {
    expect(convertDateToSimpleDateString()).toBe(null);
  });
});

describe('convertDateToTimeString', () => {
  it('should convert date to time string', () => {
    const date = new Date('2021-01-01T15:30:00');
    expect(convertDateToTimeString(date)).toBe('3:30 PM');
  });

  it('should return null if the date is not equal', () => {
    expect(convertDateToTimeString()).toBe(null);
  });

  it('should convert to 12:00 AM if time entered on date is 0', () => {
    const date = new Date('2021-01-01T00:00:00');
    expect(convertDateToTimeString(date)).toBe('12:00 AM');
  });
});

describe('convertToDate', () => {
  it('should convert to local date', () => {
    const value: RunDateTime = {
      date: '2024-01-04',
      time: '11:55 PM',
    };
    expect(convertToDate(value)).toStrictEqual(new Date('2024-01-04T23:55:00.000'));
  });

  it('should convert to local date using convertToTwentyFourHourTime function', () => {
    const value: RunDateTime = {
      date: '2024-01-04',
      time: '12:30 PM',
    };
    expect(convertToDate(value)).toStrictEqual(
      new Date(`${value.date}T${convertToTwentyFourHourTime(value.time)}:00.000`),
    );
  });
});

describe('convertToTwentyFourHourTime', () => {
  it('should convert 12 hour time to 24 hour time', () => {
    const time = '1:30 AM';
    expect(convertToTwentyFourHourTime(time)).toBe('01:30');
  });

  it('should convert past 12', () => {
    const time = '2:55 PM';
    expect(convertToTwentyFourHourTime(time)).toBe('14:55');
  });

  it('should convert from 10 AM <= x < 12PM to 24 hour time', () => {
    const time = '11:24 AM';
    expect(convertToTwentyFourHourTime(time)).toBe('11:24');
  });

  it('should convert from 12:30 PM to 12:30', () => {
    const time = '12:30 PM';
    expect(convertToTwentyFourHourTime(time)).toBe('12:30');
  });

  it('should convert from 12:30 AM to 00:30', () => {
    const time = '12:30 AM';
    expect(convertToTwentyFourHourTime(time)).toBe('00:30');
  });
});

describe('ensureTimeFormat', () => {
  it('should return time value', () => {
    expect(ensureTimeFormat('3:30 PM')).toBe('3:30 PM');
  });

  it('should ensure time format', () => {
    expect(ensureTimeFormat('')).toBe(null);
  });

  it('should return matching time format', () => {
    expect(ensureTimeFormat('3:30PM')).toBe('3:30 PM');
  });
});

describe('printSeconds', () => {
  it('should print seconds', () => {
    expect(printSeconds(3661)).toBe('1 hour, 1 minute, 1 second');
  });

  it('should handle a single unit', () => {
    expect(printSeconds(5)).toBe('5 seconds');
  });

  it('should handle a single unit at max', () => {
    expect(printSeconds(60)).toBe('1 minute');
  });

  it('should handle zero seconds', () => {
    expect(printSeconds(0)).toBe('0 seconds');
  });
});

describe('relativeTime', () => {
  it('should convert milliseconds to minutes and seconds', () => {
    expect(relativeTime(102, 30)).toBe('Just now');
  });

  it('should print ago if the current time is less than the previous', () => {
    expect(relativeTime(62000, 1)).toBe('1 minute ago');
  });

  it('should print in if the elapsed time is less than 0', () => {
    expect(relativeTime(1, 700000)).toBe('in 12 minutes');
  });

  it('should print in if the elapsed time is less than 0', () => {
    expect(relativeTime(1, 62000)).toBe('in 1 minute');
  });

  it('should return just now when previous is NaN', () => {
    expect(relativeTime(1000, NaN)).toBe('Just now');
  });

  it('should return just now if elapsed is less than 0', () => {
    expect(relativeTime(1000, 2000)).toBe('Just now');
  });

  it('should return formatted time in minutes when elapsed time is less than an hour', () => {
    const current = 1708976688173;
    const previous = current - 30 * 60 * 1000; // 30 minutes ago
    expect(relativeTime(current, previous)).toBe('30 minutes ago');
  });

  it('should return formatted time in hours when elapsed time is less than a day', () => {
    const current = 1708976688173;
    const previous = current - 6 * 60 * 60 * 1000; // 6 hours ago
    expect(relativeTime(current, previous)).toBe('6 hours ago');
  });

  it('should return formatted time in days when elapsed time is less than a month', () => {
    const current = 1708976688173;
    const previous = current - 2 * 24 * 60 * 60 * 1000; // 2 days ago
    expect(relativeTime(current, previous)).toBe('2 days ago');
  });

  it('should return formatted time in months when elapsed time is less than a year', () => {
    const current = 1708976688173;
    const previous = current - 2 * 30 * 24 * 60 * 60 * 1000; // 2 months ago
    expect(relativeTime(current, previous)).toBe('2 months ago');
  });

  it('should return formatted date when elapsed time is more than a year', () => {
    const current = 1708976688173;
    const previous = current - 2 * 365 * 24 * 60 * 60 * 1000; // 2 years ago
    expect(relativeTime(current, previous)).toMatch(/\d{1,2} [A-Za-z]+ \d{4}/); // Matches "01 Jan 2022" format
  });

  it('should get the correct month', () => {
    expect(relativeTime(2500, 1610859600000).split(' ')[1]).toBe('Jan');
    expect(relativeTime(2500, 1613538000000).split(' ')[1]).toBe('Feb');
    expect(relativeTime(2500, 1615953600000).split(' ')[1]).toBe('Mar');
    expect(relativeTime(2500, 1618632000000).split(' ')[1]).toBe('April');
    expect(relativeTime(2500, 1621224000000).split(' ')[1]).toBe('May');
    expect(relativeTime(2500, 1623902400000).split(' ')[1]).toBe('June');
    expect(relativeTime(2500, 1626494400000).split(' ')[1]).toBe('July');
    expect(relativeTime(2500, 1629172800000).split(' ')[1]).toBe('August');
    expect(relativeTime(2500, 1631851200000).split(' ')[1]).toBe('Sept');
    expect(relativeTime(2500, 1634443200000).split(' ')[1]).toBe('Oct');
    expect(relativeTime(2500, 1637125200000).split(' ')[1]).toBe('Nov');
    expect(relativeTime(2500, 1639717200000).split(' ')[1]).toBe('Dec');
  });
});

describe('convertPeriodicTimeToSeconds', () => {
  it('if numeric value is NaN, it should equal it to 0', () => {
    expect(convertPeriodicTimeToSeconds('')).toBe(0);
  });

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

  it('should convert exponential time to seconds', () => {
    const timeString = '5.2341124234234124123e+68Hour';
    const numericValue = parseFloat('5.2341124234234124123e+68');
    const expectedSeconds = numericValue * 60 * 60; // Convert hours to seconds
    expect(convertPeriodicTimeToSeconds(timeString)).toBe(expectedSeconds);
  });
});

describe('convertSecondsToPeriodicTime', () => {
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

  it('should return an empty string for 0 seconds', () => {
    expect(convertSecondsToPeriodicTime(0)).toBe('');
  });
});
