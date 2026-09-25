const DEFAULT_API_KEY_VISIBLE_PREFIX_LENGTH = 7;

/** First characters of the key stay readable; the remainder is shown as bullets (matches CreateApiKeyModal). */
export const formatApiKeyHiddenPreview = (
  apiKey: string,
  visiblePrefixLength: number = DEFAULT_API_KEY_VISIBLE_PREFIX_LENGTH,
): string => {
  if (apiKey.length <= visiblePrefixLength) {
    return apiKey;
  }
  return `${apiKey.slice(0, visiblePrefixLength)}${'•'.repeat(apiKey.length - visiblePrefixLength)}`;
};

export const formatApiKeyError = (message: string): string => {
  const maxExpirationMatch = message.match(/exceeds maximum allowed \((\d+) days\)/);
  if (maxExpirationMatch) {
    return `Requested expiration exceeds maximum allowed (${maxExpirationMatch[1]} days). Select a shorter duration and try again.`;
  }
  return message.charAt(0).toUpperCase() + message.slice(1);
};

/** JS Date cannot represent arbitrarily large day offsets; cap the calendar UI. */
export const DATE_PICKER_MAX_DAYS = 100 * 365;

export const EXPIRATION_MODE_VALUES = ['onDate', 'after', 'max'] as const;

export type ExpirationMode = (typeof EXPIRATION_MODE_VALUES)[number];

export const isExpirationMode = (v: string | number | undefined): v is ExpirationMode =>
  EXPIRATION_MODE_VALUES.some((mode) => mode === v);

export const getExpirationModeLabel = (mode: ExpirationMode, maxDays: number): string => {
  switch (mode) {
    case 'max':
      return `Use max value of ${maxDays} days`;
    case 'onDate':
      return 'On date';
    case 'after':
      return 'After';
  }
};

export const formatDatePickerValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDatePickerValue = (value: string): Date | undefined => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

/** Calendar-day difference (end - start), local dates. */
export const getCalendarDaysBetween = (start: Date, end: Date): number => {
  const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((utcEnd - utcStart) / (24 * 60 * 60 * 1000));
};

export const addCalendarDays = (from: Date, days: number): Date => {
  const result = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  result.setDate(result.getDate() + days);
  return result;
};

export const startOfLocalDay = (date: Date = new Date()): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** Max selectable calendar date: today + min(maxDays, DATE_PICKER_MAX_DAYS). */
export const getMaxSelectableExpirationDate = (maxDays: number, from: Date = new Date()): Date => {
  const cappedDays = Math.min(Math.max(maxDays, 1), DATE_PICKER_MAX_DAYS);
  return addCalendarDays(startOfLocalDay(from), cappedDays);
};

/** Min selectable date: tomorrow (at least 1 day of validity). */
export const getMinSelectableExpirationDate = (from: Date = new Date()): Date =>
  addCalendarDays(startOfLocalDay(from), 1);

/** Default "after N days" value: min(30, maxDays). */
export const getDefaultAfterDays = (maxDays: number): number => Math.min(30, Math.max(maxDays, 1));

/** Default expiration date for "On date" mode. */
export const getDefaultExpirationDate = (maxDays: number, from: Date = new Date()): Date =>
  addCalendarDays(startOfLocalDay(from), getDefaultAfterDays(maxDays));

export const getExpiresInFromDays = (days: number): string => `${days}d`;

export const getExpirationDateValidationMessage = (maxDays: number): string => {
  const pickerMax = Math.min(maxDays, DATE_PICKER_MAX_DAYS);
  if (maxDays > DATE_PICKER_MAX_DAYS) {
    return `Select a date between tomorrow and ${formatDatePickerValue(getMaxSelectableExpirationDate(pickerMax))}, or use After / max value for longer expirations`;
  }
  return `Select a date between tomorrow and ${formatDatePickerValue(getMaxSelectableExpirationDate(maxDays))}`;
};

export const getAfterDaysValidationMessage = (maxDays: number): string =>
  `Enter a value between 1 and ${maxDays} days`;

export const validateExpirationDate = (
  value: string,
  maxDays: number,
  from: Date = new Date(),
): string => {
  const date = parseDatePickerValue(value);
  if (!date) {
    return 'Enter a valid date (YYYY-MM-DD)';
  }
  const days = getCalendarDaysBetween(startOfLocalDay(from), date);
  const pickerMaxDays = Math.min(maxDays, DATE_PICKER_MAX_DAYS);
  if (days < 1 || days > pickerMaxDays) {
    return getExpirationDateValidationMessage(maxDays);
  }
  return '';
};

export const validateAfterDays = (value: string, maxDays: number): string => {
  const days = parseInt(value, 10);
  if (!value || !/^\d+$/.test(value) || days < 1 || days > maxDays) {
    return getAfterDaysValidationMessage(maxDays);
  }
  return '';
};

export const formatExpirationLabel = (days: number, mode: ExpirationMode): string => {
  if (mode === 'max') {
    return `${days} days (maximum)`;
  }
  return `${days} days`;
};
