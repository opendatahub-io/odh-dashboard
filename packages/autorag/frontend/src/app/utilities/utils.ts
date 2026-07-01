import type { PipelineRun } from '~/app/types';
import type { AutoragPattern } from '~/app/types/autoragPattern';
import { RuntimeStateKF } from '~/app/types/pipeline';
import { MAX_DISPLAY_NAME_LENGTH } from './const';

/**
 * Whether the run is in a state where it completed successfully.
 */
export const isRunCompleted = (state: string | undefined): boolean => {
  const s = state?.toUpperCase();
  return s === RuntimeStateKF.SUCCEEDED;
};

/**
 * Whether the run is in a state where it is no longer running.
 */
export const isRunInTerminalState = (state: string | undefined): boolean => {
  const s = state?.toUpperCase() ?? '';
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
export const isRunTerminatable = (state: string | undefined): boolean => {
  const s = state?.toUpperCase();
  return (
    s === RuntimeStateKF.RUNNING || s === RuntimeStateKF.PENDING || s === RuntimeStateKF.PAUSED
  );
};

/**
 * Whether the run is still in progress (not yet in a terminal state).
 * Includes CANCELING — the pipeline is still running but cannot be stopped again.
 */
export const isRunInProgress = (state: string | undefined): boolean => {
  const s = state?.toUpperCase();
  return (
    s === RuntimeStateKF.RUNNING || s === RuntimeStateKF.PENDING || s === RuntimeStateKF.CANCELING
  );
};

/**
 * Whether the run is in a terminal failure state where it can be retried.
 */
export const isRunRetryable = (state: string | undefined): boolean => {
  const s = state?.toUpperCase();
  return s === RuntimeStateKF.FAILED || s === RuntimeStateKF.CANCELED;
};

/**
 * Whether the run is in a terminal state where it can be deleted.
 */
export const isRunDeletable = (state: string | undefined): boolean => {
  const s = state?.toUpperCase();
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
 * Gets the optimized metric for AutoRAG from pipeline parameters.
 * @param pipelineRun - The pipeline run object containing parameters
 * @returns The optimized metric name from parameters, or 'faithfulness' as default
 */
export function getOptimizedMetricForRAG(pipelineRun?: PipelineRun): string {
  const parameters = pipelineRun?.runtime_config?.parameters;
  if (parameters && 'optimization_metric' in parameters) {
    const metric = parameters.optimization_metric;
    if (typeof metric === 'string') {
      return metric;
    }
  }
  return 'faithfulness';
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
 * Format metric key names for display (e.g. "answer_correctness" -> "Answer Correctness").
 */
export function formatMetricName(metricKey: string): string {
  /* eslint-disable camelcase */
  const specialCases: Record<string, string> = {
    faithfulness: 'Answer faithfulness',
    answer_correctness: 'Answer correctness',
    context_correctness: 'Context correctness',
    answer_relevancy: 'Answer relevancy',
    context_precision: 'Context precision',
    context_recall: 'Context recall',
  };
  /* eslint-enable camelcase */

  if (specialCases[metricKey]) {
    return specialCases[metricKey];
  }

  return metricKey
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Convert a snake_case key to Title Case (e.g. 'chunk_size' → 'Chunk Size').
 */
export const humanize = (key: string): string =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

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
 * Compute a rank map from an array of patterns, ranked by final_score descending.
 * Returns a Record mapping pattern name to rank (1-based).
 */
export function computePatternRankMap(patterns: AutoragPattern[]): Record<string, number> {
  const sorted = patterns.toSorted((a, b) => b.final_score - a.final_score);
  const map: Record<string, number> = {};
  sorted.forEach((p, i) => {
    map[p.name] = i + 1;
  });
  return map;
}

/**
 * Read a CSS custom property from the document root, returning a fallback
 * when the property is empty or not set (e.g. in canvas/ECharts contexts).
 */
export const getCSSVar = (name: string, fallback: string): string => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

/**
 * Format metric values for display.
 * Uses scientific notation for non-zero values that would round to 0.000.
 */
export function formatMetricValue(value: number | string): string {
  if (typeof value === 'string') {
    return value;
  }
  // If the value would round to 0.000 but is actually non-zero, use scientific notation
  const fixed = value.toFixed(3);
  if ((fixed === '0.000' || fixed === '-0.000') && value !== 0) {
    return value.toExponential(3);
  }
  return fixed;
}
