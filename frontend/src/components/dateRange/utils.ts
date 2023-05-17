/**
 * A single string value for the DateRange component.
 * @see DateRange
 * @see makeDateRange
 * @see splitDateRange
 */
export type DateRangeString = string;

const DELIMITER = ' to ';

export const makeDateRange = (
  startDate: string | Date | null,
  endDate: string | Date | null,
): DateRangeString => `${startDate ?? ''}${DELIMITER}${endDate ?? ''}`;

export const splitDateRange = (
  dateRange: DateRangeString,
): [startDate: string | null, endDate: string | null] => {
  const [startDate, endDate] = dateRange.split(DELIMITER);

  return [startDate || null, endDate || null];
};
