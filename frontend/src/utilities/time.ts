import {
  PeriodicOptions,
  RunDateTime,
  periodicOptionAsSeconds,
} from '#~/concepts/pipelines/content/createRun/types';
import { SERVER_TIMEOUT } from '#~/utilities/const.ts';

// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- re-exporting from ui-core for backward compatibility
export { relativeTime } from '@odh-dashboard/ui-core/utilities/time';

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

/* Format date for display in user's local timezone (for tooltips that should not show UTC) */
export const formatDateForLocalTooltip = (date: Date): string => {
  // Defensive check: creationTimestamp from API may be empty/malformed (e.g. new Date(''))
  if (Number.isNaN(date.getTime())) {
    return '-';
  }
  return date.toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'medium',
    hour12: false,
  });
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

// server timeout is 5 minutes; in src/utilities/const.ts
// so we are using that same timeout here
const shortTimeRangeMinuteLimit = 3; // 3 minutes
const mediumTimeRangeMinuteLimit = SERVER_TIMEOUT / 60000; // 5 minutes is the default server timeout

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

  const diffMinutes = (now - timestampMs) / 60000; // 60 000

  if (diffMinutes < 0) {
    // Future timestamp – treat as shortest range
    return 'shortRange';
  }
  if (diffMinutes > mediumTimeRangeMinuteLimit) {
    return 'longRange';
  }
  if (diffMinutes > shortTimeRangeMinuteLimit) {
    return 'mediumRange';
  }
  return 'shortRange';
};
