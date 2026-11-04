import { evaluationComparePathSegment, evaluationRootSegment } from '~/app/routes';

/**
 * Redaction policy for the `context.page` that @segment/analytics-next
 * auto-attaches to every event from `window.location` (url, path, search,
 * referrer). EvalHub routes embed namespace, collection, and job identifiers in
 * their path segments (see ../AppRoutes.tsx), so every EvalHub event
 * (`properties.event_source === 'evalhub_ui'`) passes through a Segment source
 * middleware that rewrites the page context: path segments outside this
 * structural allowlist are replaced with a placeholder, and query strings,
 * hashes, and referrer URLs are reduced to the same redacted form. Unknown
 * routes fail closed — a new route only reaches Segment after its structural
 * segments are added to this allowlist.
 */
const STRUCTURAL_PATH_SEGMENTS = new Set<string>([
  evaluationRootSegment,
  evaluationComparePathSegment,
  'collections',
  'create',
  'results',
  'reconfigure',
  'benchmarks',
  'new',
  'edit',
  'copy',
  'start',
]);

const REDACTED_SEGMENT = '[redacted]';

export type SegmentPageContext = {
  path?: string;
  referrer?: string;
  search?: string;
  title?: string;
  url?: string;
};

type SegmentSourceMiddlewareEvent = {
  properties?: { event_source?: unknown } & Record<string, unknown>;
  context?: { page?: SegmentPageContext } & Record<string, unknown>;
};

type SegmentSourceMiddleware = (middleware: {
  payload: { obj: SegmentSourceMiddlewareEvent };
  next: (payload: { obj: SegmentSourceMiddlewareEvent }) => void;
}) => void;

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    analytics?: any;
  }
}

export const redactEvalHubPathSegments = (path: string): string =>
  path
    .split('/')
    .map((segment) =>
      segment === '' || STRUCTURAL_PATH_SEGMENTS.has(segment) ? segment : REDACTED_SEGMENT,
    )
    .join('/');

export const redactEvalHubUrl = (url: string): string => {
  try {
    const parsed = new URL(url, window.location.origin);
    parsed.pathname = redactEvalHubPathSegments(parsed.pathname);
    parsed.search = '';
    parsed.hash = '';
    return parsed.href;
  } catch {
    return REDACTED_SEGMENT;
  }
};

export const sanitizeEvalHubPageContext = (page: SegmentPageContext): SegmentPageContext => ({
  ...page,
  path: page.path === undefined ? undefined : redactEvalHubPathSegments(page.path),
  url: page.url === undefined ? undefined : redactEvalHubUrl(page.url),
  referrer: page.referrer === undefined ? undefined : redactEvalHubUrl(page.referrer),
  search: '',
});

const evalHubPageContextMiddleware: SegmentSourceMiddleware = ({ payload, next }) => {
  const event = payload.obj;
  if (event.properties?.event_source === 'evalhub_ui') {
    event.context = event.context ?? {};
    event.context.page = sanitizeEvalHubPageContext(event.context.page ?? {});
  }
  next(payload);
};

let redactionRegistered = false;

export const registerEvalHubPageContextRedaction = (): void => {
  if (redactionRegistered) {
    return;
  }
  // window.analytics is any-typed by the shared analytics package; guard on
  // the one API this redaction needs.
  if (!window.analytics || typeof window.analytics.addSourceMiddleware !== 'function') {
    // Segment is not initialized (dev mode or telemetry disabled); events are
    // dropped in that state, so there is nothing to sanitize yet.
    return;
  }
  redactionRegistered = true;
  window.analytics.addSourceMiddleware(evalHubPageContextMiddleware);
};
