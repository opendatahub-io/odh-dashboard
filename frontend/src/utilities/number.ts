import { convertToUnit, MEMORY_UNITS_FOR_PARSING } from './valueUnits';

/**
 * Returns the given number rounded to 1 decimal point, unless it is less than 0.1,
 * then it will return 2 decimal points so the value is not rounded to zero.
 * If precision is passed, the above logic is ignored and the specified precision is used.
 */
export const roundNumber = (
  value: number | typeof NaN,
  precision = value < 0.1 ? 2 : 1,
): number => {
  if (Number.isNaN(value)) {
    return 0;
  }
  return parseFloat(value.toFixed(precision));
};

/**
 * Returns a GiB value with full precision.
 */
export const bytesAsPreciseGiB = (bytes?: number | typeof NaN): number => {
  if (!bytes || Number.isNaN(bytes)) {
    return 0;
  }
  const [valueAsGiB] = convertToUnit(String(bytes), MEMORY_UNITS_FOR_PARSING, 'Gi');
  return valueAsGiB;
};

/**
 * Returns a GiB value rounded to either 1 or 2 decimal places (see roundNumber).
 */
export const bytesAsRoundedGiB = (bytes?: number | typeof NaN): number =>
  roundNumber(bytesAsPreciseGiB(bytes));
