/**
 * Browser-side Content-Security-Policy violation capture.
 *
 * The dashboard ships a Content-Security-Policy with its document (enforcing or
 * Report-Only, depending on `CSP_MODE`), and there is no server-side collector: the
 * gateway runs `ext_authz` on every request, so unauthenticated browser reports sent
 * to a same-origin endpoint would be rejected. Violations are therefore captured in
 * the browser, logged to the console, surfaced as a dev-only toast, and forwarded
 * through the host tracking adapter so they carry the same cluster/version context as the
 * dashboard's other events.
 *
 * Outside development a violation is forwarded once per unique violation (disposition +
 * effective directive + blocked host) per browser per 24 hours, and only once the Segment
 * SDK is available: a violation raised before the SDK initializes is forwarded by a later
 * occurrence instead of being throttled away. In development every violation is logged.
 * URLs are stripped of query strings, fragments and credentials before transmission.
 * See docs/content-security-policy.md.
 */

import { isSegmentReady } from '@odh-dashboard/analytics';
import { fireMiscTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';

export const CSP_VIOLATION_EVENT = 'odh-csp-violation';
export const CSP_VIOLATION_SEGMENT_EVENT = 'CSP Violation';
export const CSP_VIOLATION_STORAGE_KEY = 'odh-csp-violation-reported';
export const CSP_VIOLATION_THROTTLE_MS = 24 * 60 * 60 * 1000;

const SAMPLE_MAX_LENGTH = 256;
const NON_NETWORK_SCHEMES = ['inline', 'eval', 'wasm-eval', 'data', 'blob', 'filesystem'];

export type CspViolationReport = {
  effectiveDirective: string;
  blockedHost: string;
  disposition: string;
  pagePath: string;
  sourceFile: string;
  lineNumber: number;
  columnNumber: number;
  sample: string;
  referrer: string;
  policy: string;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

type ReporterOptions = {
  devMode?: boolean;
  documentRef?: Document;
  windowRef?: Window;
  storage?: StorageLike | null;
  now?: () => number;
};

const parseUrl = (raw: string, base: string): URL | null => {
  if (!raw) {
    return null;
  }
  try {
    return new URL(raw, base);
  } catch {
    return null;
  }
};

/** Reported instead of an unparseable URL, which may still carry credentials. */
export const INVALID_URL_MARKER = 'invalid';

/**
 * Drops credentials, query string and fragment. Relative input resolves against the
 * page origin so the reported value is always an absolute, sanitized URL. Input that
 * cannot be parsed at all is replaced by {@link INVALID_URL_MARKER} rather than forwarded
 * verbatim: a malformed URL can still contain credentials.
 */
export const sanitizeUrl = (raw: string, base: string = window.location.origin): string => {
  if (!raw) {
    return '';
  }
  const url = parseUrl(raw, base);
  if (!url) {
    return INVALID_URL_MARKER;
  }
  return `${url.protocol}//${url.host}${url.pathname}`;
};

/**
 * The host that was blocked. Non-network sources (`inline`, `eval`, `data`, `blob`)
 * are reported as the token the browser uses, since they have no host.
 */
export const blockedHost = (blockedURI: string, base: string = window.location.origin): string => {
  if (!blockedURI) {
    return 'unknown';
  }
  const scheme = blockedURI.split(':')[0].toLowerCase();
  if (NON_NETWORK_SCHEMES.includes(scheme)) {
    return scheme;
  }
  const url = parseUrl(blockedURI, base);
  return url ? url.host : sanitizeUrl(blockedURI, base);
};

const subscribers = new Set<(report: CspViolationReport) => void>();

/**
 * Subscribes to every captured violation, before throttling. Used by the dev-only
 * toast; production consumers should prefer the Segment event.
 */
export const subscribeToCspViolations = (
  listener: (report: CspViolationReport) => void,
): (() => void) => {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
};

/** Uniqueness includes the disposition: a report-only and an enforced event differ. */
const violationKey = (
  report: Pick<CspViolationReport, 'disposition' | 'effectiveDirective' | 'blockedHost'>,
): string => `${report.disposition}|${report.effectiveDirective}|${report.blockedHost}`;

const toReport = (
  event: SecurityPolicyViolationEvent,
  pagePath: string,
  origin: string,
): CspViolationReport => ({
  effectiveDirective: event.effectiveDirective,
  blockedHost: blockedHost(event.blockedURI, origin),
  disposition: event.disposition,
  pagePath,
  sourceFile: sanitizeUrl(event.sourceFile, origin),
  lineNumber: event.lineNumber,
  columnNumber: event.columnNumber,
  sample: event.sample.slice(0, SAMPLE_MAX_LENGTH),
  referrer: sanitizeUrl(event.referrer, origin),
  policy: event.originalPolicy,
});

const readThrottle = (storage: StorageLike | null, now: number): Record<string, number> => {
  if (!storage) {
    return {};
  }
  try {
    const raw = storage.getItem(CSP_VIOLATION_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    const activeEntries = Object.entries(parsed).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === 'number' && now - entry[1] < CSP_VIOLATION_THROTTLE_MS,
    );
    return Object.fromEntries(activeEntries);
  } catch {
    return {};
  }
};

const writeThrottle = (storage: StorageLike | null, entries: Record<string, number>): void => {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(CSP_VIOLATION_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage may be unavailable (private mode, quota); throttling degrades to none.
  }
};

const defaultStorage = (): StorageLike | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/** Clears the throttle window. Exported for tests. */
export const clearCspViolationThrottle = (storage: StorageLike | null = defaultStorage()): void => {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(CSP_VIOLATION_STORAGE_KEY, '{}');
  } catch {
    // ignore
  }
};

const reportViolation = (report: CspViolationReport): void => {
  // The host adapter owns cluster/version metadata and SDK access; the reporter never
  // touches either. The legacy adapter is replaced by the Segment migration, which is also
  // where accepted-only throttling returns (see `sendTelemetry`).
  fireMiscTrackingEvent(CSP_VIOLATION_SEGMENT_EVENT, report);
};

/**
 * Installs the violation listener. Returns a cleanup function.
 *
 * - Every violation is logged with `console.warn`.
 * - In dev mode an `odh-csp-violation` window event is dispatched once per unique
 *   violation so the UI can show a toast.
 * - Every violation is forwarded through the host tracking adapter, which decides
 *   whether it is logged or sent. The reporter never inspects the SDK itself.
 * - Outside development the same violation is forwarded at most once per browser per
 *   24 hours; development logging is never throttled.
 */
export const installCspViolationReporter = ({
  devMode = false,
  documentRef = document,
  windowRef = window,
  storage = defaultStorage(),
  now = Date.now,
}: ReporterOptions = {}): (() => void) => {
  const shownThisSession = new Set<string>();

  // Local UI feedback happens once per unique violation per page session.
  const notifyUi = (report: CspViolationReport, key: string): void => {
    if (shownThisSession.has(key)) {
      return;
    }
    shownThisSession.add(key);
    subscribers.forEach((listener) => listener(report));
    if (devMode) {
      windowRef.dispatchEvent(
        new CustomEvent<CspViolationReport>(CSP_VIOLATION_EVENT, { detail: report }),
      );
    }
  };

  // Development logs instead of sending, so there is nothing to throttle: the per-violation
  // warning above is the development signal. Outside development the same violation is
  // forwarded at most once per browser per 24 hours.
  const sendTelemetry = (report: CspViolationReport, key: string): void => {
    if (process.env.APP_ENV === 'development') {
      return;
    }
    const timestamp = now();
    const throttle = readThrottle(storage, timestamp);
    if (key in throttle) {
      return;
    }
    reportViolation(report);
    // The adapter drops events until the Segment SDK is initialized, so only open the
    // window once delivery can happen. Otherwise a startup violation would suppress the
    // next occurrence for 24 hours without ever reaching telemetry.
    if (isSegmentReady()) {
      writeThrottle(storage, { ...throttle, [key]: timestamp });
    }
  };

  const handler = (event: SecurityPolicyViolationEvent): void => {
    const { origin, pathname } = windowRef.location;
    const report = toReport(event, pathname, origin);
    const key = violationKey(report);

    // eslint-disable-next-line no-console
    console.warn(
      `[CSP] ${report.effectiveDirective} blocked ${report.blockedHost} on ${report.pagePath}`,
    );

    notifyUi(report, key);
    sendTelemetry(report, key);
  };

  documentRef.addEventListener('securitypolicyviolation', handler);

  return () => documentRef.removeEventListener('securitypolicyviolation', handler);
};
