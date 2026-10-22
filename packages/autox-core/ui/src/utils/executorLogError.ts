/**
 * Utilities for extracting actionable failure messages from KFP launcher
 * executor logs (`executor-logs-0` artifacts).
 *
 * On DSP v2 servers the KFP run/task APIs return no error details, but the
 * launcher uploads each component's stdout/stderr to S3. When a component
 * crashes, that log ends with the Python traceback — the exception line is
 * the actionable message. The log may also carry launcher shutdown noise
 * after the traceback (klog `E…` lines, logrus `time=…` lines,
 * `Error: exit status 1`), which is stripped here.
 */

export const EXECUTOR_ERROR_MAX_LENGTH_DEFAULT = 1500;

export type ExtractExecutorLogErrorOptions = {
  /** Cap on the returned message length; the tail is kept. Default 1500. */
  maxLength?: number;
};

const TRACEBACK_MARKER = 'Traceback (most recent call last):';

/** klog shutdown lines, e.g. `E1015 13:34:47.812345      1 launcher_v2.go:450] …` */
const KLOG_NOISE = /^[EFIW]\d{4} \d{2}:\d{2}:\d{2}\.\d+\s+\d+ \S+:\d+\]/;
/** logrus lines, e.g. `time="2026-10-15T13:34:47Z" level=info msg="sub-process exited" argo=true` */
const LOGRUS_NOISE = /^time="[^"]*" level=\w+ msg=/;
/** Launcher exit summary line. */
const EXIT_STATUS_NOISE = /^Error: exit status \d+$/;

function isLauncherNoiseLine(line: string): boolean {
  return (
    line === '' || KLOG_NOISE.test(line) || LOGRUS_NOISE.test(line) || EXIT_STATUS_NOISE.test(line)
  );
}

/**
 * Extract the failure message from a KFP launcher executor log.
 *
 * Returns the last traceback with trailing launcher-noise lines stripped —
 * the exception line is last in a traceback, so the tail carries the message —
 * or `undefined` when the log contains no traceback (the caller falls back to
 * a generic failure message). When the result exceeds `maxLength`, the tail is
 * kept and prefixed with a truncation notice.
 */
export function extractExecutorLogError(
  logText: string,
  options?: ExtractExecutorLogErrorOptions,
): string | undefined {
  // Normalize CRLF logs so per-line noise matching is not defeated by '\r'.
  const normalized = logText.replace(/\r\n/g, '\n');

  const markerIdx = normalized.lastIndexOf(TRACEBACK_MARKER);
  if (markerIdx === -1) {
    return undefined;
  }

  const start = normalized.lastIndexOf('\n', markerIdx) + 1;
  const lines = normalized.slice(start).split('\n');

  // Strip trailing launcher-noise lines; stop at the first non-noise line so
  // multi-line exception messages survive.
  while (lines.length > 0 && isLauncherNoiseLine(lines[lines.length - 1])) {
    lines.pop();
  }

  // Only the marker line itself (or nothing) survived — no exception content.
  if (lines.length <= 1) {
    return undefined;
  }

  let result = lines.join('\n');
  const maxLength = options?.maxLength ?? EXECUTOR_ERROR_MAX_LENGTH_DEFAULT;
  if (result.length > maxLength) {
    const omitted = result.length - maxLength;
    result = `[... truncated ${omitted} earlier characters ...]\n${result.slice(-maxLength)}`;
  }

  result = result.trim();
  return result.length > 0 ? result : undefined;
}
