import { RuntimeStateKF } from '~/app/types/pipeline';
import { MAX_DISPLAY_NAME_LENGTH } from './const';

const VALID_RUNTIME_STATES = new Set<string>(Object.values(RuntimeStateKF));

/** Accepts only known KFP runtime state strings; otherwise returns undefined. */
export const normalizePipelineRunState = (state: unknown): string | undefined => {
  if (typeof state !== 'string') {
    return undefined;
  }
  const normalized = state.trim();
  if (normalized.length === 0) {
    return undefined;
  }
  const upper = normalized.toUpperCase();
  return VALID_RUNTIME_STATES.has(upper) ? upper : undefined;
};

/**
 * Whether the run is in a state where it completed successfully.
 */
export const isRunCompleted = (state: unknown): boolean =>
  normalizePipelineRunState(state) === RuntimeStateKF.SUCCEEDED;

/**
 * Whether the run is in a state where it is no longer running.
 */
export const isRunInTerminalState = (state: unknown): boolean => {
  const s = normalizePipelineRunState(state);
  if (!s) {
    return false;
  }
  const TERMINAL_STATES: Set<string> = new Set([
    RuntimeStateKF.SUCCEEDED,
    RuntimeStateKF.FAILED,
    RuntimeStateKF.CANCELED,
    RuntimeStateKF.SKIPPED,
    RuntimeStateKF.CACHED,
  ]);
  return TERMINAL_STATES.has(s);
};

/**
 * Whether the run is in a state where it can be terminated (stopped).
 */
export const isRunTerminatable = (state: unknown): boolean => {
  const s = normalizePipelineRunState(state);
  return (
    s === RuntimeStateKF.RUNNING || s === RuntimeStateKF.PENDING || s === RuntimeStateKF.PAUSED
  );
};

/**
 * Whether the run is still in progress (not yet in a terminal state).
 * Includes CANCELING — the pipeline is still running but cannot be stopped again.
 */
export const isRunInProgress = (state: unknown): boolean => {
  const s = normalizePipelineRunState(state);
  return (
    s === RuntimeStateKF.RUNNING || s === RuntimeStateKF.PENDING || s === RuntimeStateKF.CANCELING
  );
};

/**
 * Whether the run is in a terminal failure state where it can be retried.
 */
export const isRunRetryable = (state: unknown): boolean => {
  const s = normalizePipelineRunState(state);
  return s === RuntimeStateKF.FAILED || s === RuntimeStateKF.CANCELED;
};

/**
 * Whether the run is in a terminal state where it can be deleted.
 */
export const isRunDeletable = (state: unknown): boolean => {
  const s = normalizePipelineRunState(state);
  return (
    s === RuntimeStateKF.SUCCEEDED || s === RuntimeStateKF.FAILED || s === RuntimeStateKF.CANCELED
  );
};

/**
 * Extracts HTTP status from Error.message when handleRestFailures (mod-arch-core)
 * has flattened AxiosError to a plain Error, so 403/404/503 branches can still run.
 * @param error - The error object to parse
 * @returns The HTTP status code, or undefined if not found
 */
export function parseErrorStatus(error: Error): number | undefined {
  const match =
    error.message.match(/\bstatus\s+code\s+(\d{3})\b/i) ??
    error.message.match(/\bstatus[:\s]+(\d{3})\b/i) ??
    error.message.match(/\b(403|404|503)\b/);
  if (match) {
    const code = parseInt(match[1], 10);
    return code >= 100 && code < 600 ? code : undefined;
  }
  return undefined;
}

/**
 * Formats the elapsed time between two ISO timestamps as a short human-readable string
 * (e.g. "34 s", "1 m 42 s", "2 h 5 m"). Returns undefined when either timestamp is missing
 * or the resulting duration is invalid.
 */
export function formatDurationBetween(startStr?: string, endStr?: string): string | undefined {
  if (!startStr || !endStr) {
    return undefined;
  }

  const ms = new Date(endStr).getTime() - new Date(startStr).getTime();
  if (ms < 0 || !Number.isFinite(ms)) {
    return undefined;
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours} h ${minutes} m` : `${hours} h`;
  }
  if (minutes > 0) {
    return seconds > 0 ? `${minutes} m ${seconds} s` : `${minutes} m`;
  }
  return seconds > 0 ? `${seconds} s` : '< 1 s';
}

export function sanitizeFilename(str: string): string {
  return (
    str
      // eslint-disable-next-line no-control-regex
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^[.\s]+|[.\s]+$/g, '')
      .trim() || 'unknown'
  );
}

/**
 * Generates a reconfigure display name by appending or incrementing a ` - N` suffix.
 * If the result exceeds {@link MAX_DISPLAY_NAME_LENGTH}, the base name is truncated
 * and `...` is inserted so the full string (with suffix) fits within the limit.
 *
 * Examples:
 *  - "my-run" → "my-run - 1"
 *  - "my-run - 1" → "my-run - 2"
 *  - "my-run - 99" → "my-run - 100"
 *  - (248-char name) → "(244-char)... - 1"
 */
export function generateReconfigureName(originalName: string): string {
  const match = originalName.match(/^(.*) - (\d+)$/);
  const baseName = match ? match[1] : originalName;
  const nextNum = match ? (BigInt(match[2]) + 1n).toString() : '1';
  const suffix = ` - ${nextNum}`;

  const result = `${baseName}${suffix}`;
  const codePoints = Array.from(result);
  if (codePoints.length <= MAX_DISPLAY_NAME_LENGTH) {
    return result;
  }

  const ellipsis = '...';
  const suffixLen = Array.from(suffix).length;
  const maxBaseLen = Math.max(0, MAX_DISPLAY_NAME_LENGTH - suffixLen - ellipsis.length);
  const truncatedBase = Array.from(baseName).slice(0, maxBaseLen).join('');
  return Array.from(`${truncatedBase}${ellipsis}${suffix}`)
    .slice(0, MAX_DISPLAY_NAME_LENGTH)
    .join('');
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Insert a non-breaking space between a word prefix and trailing digits.
 * e.g. "Pattern7" → "Pattern\u00a07"
 */
export function formatPatternName(name: string): string {
  return name.replace(/(\S)\s*(\d+)$/, '$1\u00a0$2');
}

/**
 * Convert a snake_case key to Title Case (e.g. 'chunk_size' → 'Chunk Size').
 */
const HUMANIZE_OVERRIDES: Record<string, string> = {
  // eslint-disable-next-line camelcase
  duration_seconds: 'Duration (seconds)',
};

export const humanize = (key: string): string =>
  HUMANIZE_OVERRIDES[key] ??
  key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bId\b/g, 'ID');

/**
 * Format an unknown value for display in a key-value list.
 * Returns '—' for null/undefined, stringifies primitives, and JSON.stringifies objects.
 */
export const formatDisplayValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '\u2014';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
};

/**
 * Read a CSS custom property from the document root, returning a fallback
 * when the property is empty or not set (e.g. in canvas/ECharts contexts).
 */
export const getCSSVar = (name: string, fallback: string): string => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

/** Match exact task dir or task dir + hyphen + KFP branch numeric suffix (e.g. `-2`). */
export function isComponentTaskDirName(dirName: string, pattern: string): boolean {
  if (dirName === pattern) {
    return true;
  }
  if (!dirName.startsWith(`${pattern}-`)) {
    return false;
  }
  const suffix = dirName.slice(pattern.length + 1);
  return suffix.length > 0 && /^\d+$/.test(suffix);
}

/**
 * Find an S3 common-prefix directory whose leaf name matches the task path or a
 * KFP branch suffix variant (`task-2`). The suffix disambiguates conditional
 * branches and is unrelated to retries or recency; at most one match is expected.
 * Returns the prefix without a trailing slash, or `undefined` when none match.
 */
export function findComponentTaskPrefix(
  commonPrefixes: { prefix: string }[],
  pattern: string,
): string | undefined {
  const match = commonPrefixes.find((p) => {
    const segments = p.prefix.split('/').filter(Boolean);
    const dirName = segments[segments.length - 1] ?? '';
    return isComponentTaskDirName(dirName, pattern);
  });
  return match ? match.prefix.replace(/\/$/, '') : undefined;
}
