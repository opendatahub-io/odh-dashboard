import {
  PeriodicOptions,
  RunDateTime,
  periodicOptionAsSeconds,
} from '#~/concepts/pipelines/content/createRun/types';

const printAgo = (time: number, unit: string) => `${time} ${unit}${time > 1 ? 's' : ''} ago`;
const printIn = (time: number, unit: string) => `in ${time} ${unit}${time > 1 ? 's' : ''}`;
const leadZero = (v: number) => (v < 10 ? `0${v}` : `${v}`);

export const relativeDuration = (valueInMs: number): string =>
  printSeconds(Math.floor(valueInMs / 1000));

/** As YYYY-MM-DD */
export const convertDateToSimpleDateString = (date?: Date): string | null => {
  if (!date) {
    return null;
  }

  return `${date.getUTCFullYear()}-${leadZero(date.getUTCMonth() + 1)}-${leadZero(
    date.getUTCDate(),
  )}`;
};

/** As HH:MM *M */
export const convertDateToTimeString = (date?: Date): string | null => {
  if (!date) {
    return null;
  }

  const hours = date.getHours();
  const hoursIn12 = (hours >= 12 ? hours - 12 : hours) || 12;

  return `${hoursIn12}:${leadZero(date.getMinutes())} ${hours >= 12 ? 'PM' : 'AM'}`;
};

export const convertToDate = ({ date, time }: RunDateTime): Date =>
  new Date(`${date}T${convertToTwentyFourHourTime(time)}:00.000`);

/* Return HH:MM from HH:MM *M */
export const convertToTwentyFourHourTime = (time: string): string => {
  const timeArray = time.trim().split(' ');
  const hourMinutesArray = timeArray[0].trim().split(':');
  const hour = Number(hourMinutesArray[0]);
  const minutes = hourMinutesArray[1];
  if (timeArray[1] === 'AM') {
    return `${hour === 12 ? 0 : hour}:${minutes}`.padStart(5, '0');
  }
  return `${hour === 12 ? hour : hour + 12}:${minutes}`;
};

/** The TimeField component can sometimes cause '6:00PM' instead of '6:00 PM' if the user edits directly */
export const ensureTimeFormat = (time: string): string | null => {
  if (/\s[AP]M/.test(time)) {
    // Not a problem, return the value
    return time;
  }
  const match = time.match(/(\d{1,2}:\d{2})\s?([AP]M)/);
  if (!match) {
    return null;
  }

  return `${match[1]} ${match[2]}`;
};

export const printSeconds = (seconds: number): string => {
  if (seconds === 0) {
    return '0 seconds';
  }
  const timeBlocks = [
    { unit: 'second', maxPer: 60 },
    { unit: 'minute', maxPer: 60 },
    { unit: 'hour', maxPer: 24 },
    { unit: 'day', maxPer: Infinity },
  ];
  const handleSingle = (value: number, text: string) =>
    `${value} ${value === 1 ? text : `${text}s`}`;

  const [text] = timeBlocks.reduce<[displayText: string, remainingUnit: number]>(
    (acc, timeBlock) => {
      const [currentText, unit] = acc;
      if (unit === 0) {
        return acc;
      }

      let newUnit = unit;
      let thisText = '';
      if (newUnit >= timeBlock.maxPer) {
        const remainder = newUnit % timeBlock.maxPer;
        newUnit = Math.floor(unit / timeBlock.maxPer); // shift to the next unit

        if (remainder !== 0) {
          thisText = handleSingle(remainder, timeBlock.unit);
        }
      } else {
        thisText = handleSingle(unit, timeBlock.unit);
        newUnit = 0; // hit max, zero out the unit
      }

      if (!currentText) {
        return [thisText, newUnit];
      }

      return [`${thisText}, ${currentText}`, newUnit];
    },
    ['', seconds],
  );
  return text;
};

export const relativeTime = (current: number, previous: number): string => {
  const msPerMinute = 60 * 1000;
  const msPerHour = msPerMinute * 60;
  const msPerDay = msPerHour * 24;
  const msPerMonth = msPerDay * 30;
  const msPerYear = msPerDay * 365;

  if (Number.isNaN(previous)) {
    return 'Just now';
  }

  let elapsed = current - previous;
  let shortPrintFn = printAgo;

  if (elapsed < 0) {
    elapsed *= -1;
    shortPrintFn = printIn;
  }

  if (elapsed < msPerMinute) {
    return 'Just now';
  }
  if (elapsed < msPerHour) {
    return shortPrintFn(Math.round(elapsed / msPerMinute), 'minute');
  }
  if (elapsed < msPerDay) {
    return shortPrintFn(Math.round(elapsed / msPerHour), 'hour');
  }
  if (elapsed < msPerMonth) {
    return shortPrintFn(Math.round(elapsed / msPerDay), 'day');
  }
  if (elapsed < msPerYear) {
    return shortPrintFn(Math.round(elapsed / msPerMonth), 'month');
  }
  const date = new Date(previous);

  const month = date.getMonth();
  let monthAsString = 'Jan';
  if (month === 1) {
    monthAsString = 'Feb';
  } else if (month === 2) {
    monthAsString = 'Mar';
  } else if (month === 3) {
    monthAsString = 'April';
  } else if (month === 4) {
    monthAsString = 'May';
  } else if (month === 5) {
    monthAsString = 'June';
  } else if (month === 6) {
    monthAsString = 'July';
  } else if (month === 7) {
    monthAsString = 'August';
  } else if (month === 8) {
    monthAsString = 'Sept';
  } else if (month === 9) {
    monthAsString = 'Oct';
  } else if (month === 10) {
    monthAsString = 'Nov';
  } else if (month === 11) {
    monthAsString = 'Dec';
  }

  return `${date.getDate()} ${monthAsString} ${date.getFullYear()}`;
};

/** Function to convert time strings like "2Hour" to seconds */
export const convertPeriodicTimeToSeconds = (timeString: string): number => {
  const numericMatch = timeString.match(/^[\d.eE+-]+/);
  let numericValue = numericMatch ? parseFloat(numericMatch[0]) : 1;

  if (Number.isNaN(numericValue)) {
    numericValue = 1;
  }

  const unit = timeString.replace(/^[\d.eE+-]+/, '').toLowerCase();

  switch (unit) {
    case 'hour':
      return numericValue * 60 * 60;
    case 'minute':
      return numericValue * 60;
    case 'day':
      return numericValue * 24 * 60 * 60;
    case 'week':
      return numericValue * 7 * 24 * 60 * 60;
    default:
      return 0;
  }
};

/** Function to convert seconds to time strings like "2Hour" */
export const convertSecondsToPeriodicTime = (seconds: number): string => {
  const units = Object.values(PeriodicOptions).reverse();
  const unitFactors = Object.values(periodicOptionAsSeconds).reverse();

  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    const unitFactor = unitFactors[i];

    if (seconds >= unitFactor) {
      const count = Math.floor(seconds / unitFactor);
      return `${count}${unit}`;
    }
  }

  return '';
};

// keep this part:

// server timeout is 5 minutes; in src/utilities/const.ts
// SERVER_TIMEOUT = process.env.SERVER_TIMEOUT ? parseInt(process.env.SERVER_TIMEOUT) : 300000; // 5 minutes

// end of keep this part

// so we are using 60 seconds for now; change back! DANGER WILL ROBINSON!
// temp change for development; change back! DANGER WILL ROBINSON!
const shortTimeRangeSecondLimit = 60;
const mediumTimeRangeSecondLimit = 90;

export const getTimeRangeCategory = (
  timestamp: string | undefined | null,
): 'shortRange' | 'mediumRange' | 'longRange' => {
  if (!timestamp) {
    return 'longRange';
  }
  const now = Date.now();
  const timestampMs = new Date(timestamp).getTime();

  if (Number.isNaN(timestampMs)) {
    return 'longRange';
  }

  const diffSecs = (now - timestampMs) / 1000; // 60 000
  // const diffMinutes = (now - timestampMs) / 60000; // 60 000

  if (diffSecs < 0) {
    // if (diffMinutes < 0) {
    // Future timestamp – treat as shortest range
    return 'shortRange';
  }
  if (diffSecs > mediumTimeRangeSecondLimit) {
    // if (diffMinutes > mediumTimeRangeMinuteLimit) {
    return 'longRange';
  }
  if (diffSecs > shortTimeRangeSecondLimit) {
    // if (diffMinutes > shortTimeRangeMinuteLimit) {
    return 'mediumRange';
  }
  return 'shortRange';
};
