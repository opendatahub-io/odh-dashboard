import { z } from 'zod';
import { ModelSubscriptionRef, RateLimit, TokenRateLimit } from '~/app/types/subscriptions';

const WINDOW_SUFFIX_TO_UNIT: Record<string, RateLimit['unit']> = {
  s: 'second',
  m: 'minute',
  h: 'hour',
};

const UNIT_TO_WINDOW_SUFFIX: Record<RateLimit['unit'], string> = {
  second: 's',
  minute: 'm',
  hour: 'h',
};

const HUMAN_UNIT_TO_RATE_LIMIT: Record<string, RateLimit['unit']> = {
  second: 'second',
  seconds: 'second',
  minute: 'minute',
  minutes: 'minute',
  hour: 'hour',
  hours: 'hour',
};

export const formatLocaleNumber = (value: number): string => value.toLocaleString('en-US');

export const UNIT_OPTIONS: { value: RateLimit['unit']; label: string }[] = [
  { value: 'hour', label: 'hour' },
  { value: 'minute', label: 'minute' },
  { value: 'second', label: 'second' },
];

/**
 * Parses a window string (e.g. "24h", "30m") into a numeric time value and unit.
 * Falls back to { time: 1, unit: 'hour' } for unrecognized formats.
 */
export const parseWindow = (window: string): { time: number; unit: RateLimit['unit'] } => {
  const trimmed = window.trim();

  const compactMatch = trimmed.match(/^(\d+)([smh])$/i);
  if (compactMatch) {
    const time = parseInt(compactMatch[1], 10);
    const unit = WINDOW_SUFFIX_TO_UNIT[compactMatch[2].toLowerCase()] ?? 'hour';
    return { time, unit };
  }

  const humanMatch = trimmed.match(/^(\d+)\s+(second|minute|hour)s?$/i);
  if (humanMatch) {
    const time = parseInt(humanMatch[1], 10);
    const unit = HUMAN_UNIT_TO_RATE_LIMIT[humanMatch[2].toLowerCase()] ?? 'hour';
    return { time, unit };
  }

  const durationMatch = trimmed.match(/^(\d+)([smh])/i);
  if (durationMatch) {
    const time = parseInt(durationMatch[1], 10);
    const unit = WINDOW_SUFFIX_TO_UNIT[durationMatch[2].toLowerCase()] ?? 'hour';
    return { time, unit };
  }

  return { time: 1, unit: 'hour' };
};

/**
 * Formats a window string (e.g. "24h") into a human-readable form (e.g. "24 hours").
 * Handles pluralization: "1 hour" vs "24 hours".
 */
const formatWindowTime = (time: number, unit: RateLimit['unit']): string =>
  `${formatLocaleNumber(time)} ${unit}${time === 1 ? '' : 's'}`;

export const formatWindow = (window: string): string => {
  const trimmed = window.trim();
  const parsed = parseWindow(trimmed);

  if (/^(\d+)([smh])$/i.test(trimmed)) {
    return formatWindowTime(parsed.time, parsed.unit);
  }

  if (/^(\d+)\s+(second|minute|hour)s?$/i.test(trimmed)) {
    return formatWindowTime(parsed.time, parsed.unit);
  }

  if (/^(\d+)([smh])/i.test(trimmed)) {
    return formatWindowTime(parsed.time, parsed.unit);
  }

  // Upstream may already return a human-readable label; locale-format large numbers in-place.
  return trimmed.replace(/\d+/g, (digits) => {
    const value = parseInt(digits, 10);
    return value >= 1000 ? formatLocaleNumber(value) : digits;
  });
};

export const formatTokenRateLimitLine = (limit: number, window: string): string =>
  `${formatLocaleNumber(limit)} / ${formatWindow(window)}`;

/** Converts a BFF TokenRateLimit to the UI's RateLimit form. */
export const toRateLimit = (trl: TokenRateLimit): RateLimit => {
  const { time, unit } = parseWindow(trl.window);
  return { count: trl.limit, time, unit };
};

/** Converts the UI's RateLimit form back to a BFF TokenRateLimit. */
export const toTokenRateLimit = (rl: RateLimit): TokenRateLimit => ({
  limit: rl.count,
  window: `${rl.time}${UNIT_TO_WINDOW_SUFFIX[rl.unit]}`,
});

export const formatTokenLimits = (limits: ModelSubscriptionRef['tokenRateLimits']): string => {
  if (limits.length === 0) {
    return '—';
  }
  return limits.map((l) => formatTokenRateLimitLine(l.limit, l.window)).join(' | ');
};

export const DEFAULT_RATE_LIMIT: RateLimit = { count: 1000, time: 1, unit: 'hour' };
export const MAX_VALUE = 1_000_000_000;
export const MAX_WINDOW_VALUE = 9_999;

export const exceedsTokenLimit = (n: number): boolean =>
  !Number.isNaN(n) && Math.trunc(Math.abs(n)) > MAX_VALUE;

export const exceedsWindowLimit = (n: number): boolean =>
  !Number.isNaN(n) && Math.trunc(Math.abs(n)) > MAX_WINDOW_VALUE;

export const rateLimitExceedsMaxDigits = (limit: RateLimit): boolean =>
  exceedsTokenLimit(limit.count) || exceedsWindowLimit(limit.time);

export const rateLimitSchema = z.object({
  count: z
    .number()
    .int()
    .min(1, 'Token count must be greater than 0')
    .max(MAX_VALUE, 'Token count exceeds maximum allowed value'),
  time: z
    .number()
    .int()
    .min(1, 'Time value must be greater than 0')
    .max(MAX_WINDOW_VALUE, 'Time value exceeds maximum allowed value'),
  unit: z.enum(['hour', 'minute', 'second']),
});

export const rateLimitsSchema = z
  .array(rateLimitSchema)
  .min(1, 'At least one token rate limit is required');

export const getCountError = (limit: RateLimit): string | undefined => {
  if (Number.isNaN(limit.count)) {
    return 'Token count is required';
  }
  const result = rateLimitSchema.shape.count.safeParse(limit.count);
  return result.success ? undefined : result.error.issues[0].message;
};

export const getTimeError = (limit: RateLimit): string | undefined => {
  if (Number.isNaN(limit.time)) {
    return 'Time value is required';
  }
  const result = rateLimitSchema.shape.time.safeParse(limit.time);
  return result.success ? undefined : result.error.issues[0].message;
};

export const getCountDigitError = (limit: RateLimit): string | undefined =>
  exceedsTokenLimit(limit.count) ? 'Token count exceeds maximum allowed value' : undefined;

export const getTimeDigitError = (limit: RateLimit): string | undefined =>
  exceedsWindowLimit(limit.time) ? 'Time value exceeds maximum allowed value' : undefined;
