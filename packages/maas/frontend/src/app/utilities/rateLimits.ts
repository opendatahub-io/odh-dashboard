import { RateLimit, TokenRateLimit } from '~/app/types/subscriptions';

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
  const match = window.match(/^(\d+)(s|m|h)$/);
  if (!match) {
    return { time: 1, unit: 'hour' };
  }
  const time = parseInt(match[1], 10);
  const unit = WINDOW_SUFFIX_TO_UNIT[match[2]] ?? 'hour';
  return { time, unit };
};

/**
 * Formats a window string (e.g. "24h") into a human-readable form (e.g. "24 hours").
 * Handles pluralization: "1 hour" vs "24 hours".
 */
export const formatWindow = (window: string): string => {
  const { time, unit } = parseWindow(window);
  return `${time} ${unit}${time === 1 ? '' : 's'}`;
};

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
