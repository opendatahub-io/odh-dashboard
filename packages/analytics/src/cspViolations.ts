/**
 * Browser-side Content-Security-Policy violation capture.
 *
 * The dashboard serves an enforcing CSP, and there is no server-side collector: the
 * gateway runs `ext_authz` on every request, so unauthenticated browser reports sent
 * to a same-origin endpoint would be rejected. Violations are therefore captured in
 * the browser, logged to the console, surfaced as a dev-only toast, and forwarded
 * through `fireTrackingEvent` so they carry the same cluster/version context as the
 * dashboard's other events.
 *
 * Outside development a violation is forwarded once per unique violation (effective
 * directive + blocked host) per browser per 24 hours; in development every violation is
 * logged. URLs are stripped of query strings, fragments and credentials before
 * transmission. See docs/content-security-policy.md.
 */

import { fireTrackingEvent } from './segmentUtils';

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

/**
 * Drops credentials, query string and fragment. Relative input resolves against the
 * page origin so the reported value is always an absolute, sanitized URL.
 */
export const sanitizeUrl = (raw: string, base: string = window.location.origin): string => {
  const url = parseUrl(raw, base);
  if (!url) {
    return raw.split(/[?#]/)[0];
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

const violationKey = (
  report: Pick<CspViolationReport, 'effectiveDirective' | 'blockedHost'>,
): string => `${report.effectiveDirective}|${report.blockedHost}`;

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

const sendToSegment = (report: CspViolationReport): void => {
  // Mirrors the binding in frontend/src/concepts/analyticsTracking/segmentIOUtils.tsx.
  fireTrackingEvent(CSP_VIOLATION_SEGMENT_EVENT, report, {
    clusterID: window.clusterID ?? '',
    devMode: process.env.APP_ENV === 'development',
    version: process.env.INTERNAL_DASHBOARD_VERSION ?? '',
  });
};

/**
 * Installs the violation listener. Returns a cleanup function.
 *
 * - Every violation is logged with `console.warn`.
 * - In dev mode an `odh-csp-violation` window event is dispatched once per unique
 *   violation so the UI can show a toast.
 * - Every violation is forwarded through `fireTrackingEvent`, which logs it in
 *   development and (when the SDK exists) sends it otherwise. The reporter never
 *   inspects the SDK itself.
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

  // Development logs instead of sending, so there is nothing to throttle: every
  // violation reaches `fireTrackingEvent` and therefore the console. Outside development
  // the same violation is forwarded at most once per browser per 24 hours.
  const sendTelemetry = (report: CspViolationReport, key: string): void => {
    if (process.env.APP_ENV !== 'development') {
      const timestamp = now();
      const throttle = readThrottle(storage, timestamp);
      if (key in throttle) {
        return;
      }
      writeThrottle(storage, { ...throttle, [key]: timestamp });
    }
    sendToSegment(report);
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
