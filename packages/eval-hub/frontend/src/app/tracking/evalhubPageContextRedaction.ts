import { evaluationRootSegment, evaluationComparePathSegment } from '~/app/routeSegments';

/**
 * Redaction policy for the `context.page` that @segment/analytics-next
 * auto-attaches to every event from `window.location` (url, path, search,
 * referrer). EvalHub routes embed namespace, collection, and job identifiers in
 * their path segments, so every EvalHub event
 * (`properties.event_source === 'evalhub_ui'`) supplies a policy that rewrites the page context: path segments outside this
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

export const redactEvalHubPathSegments = (path: string): string =>
  path
    .split('/')
    .map((segment) =>
      segment === '' || STRUCTURAL_PATH_SEGMENTS.has(segment) ? segment : REDACTED_SEGMENT,
    )
    .join('/');

export const redactEvalHubUrl = (url: string, baseOrigin: string): string => {
  try {
    const parsed = new URL(url, baseOrigin);
    parsed.pathname = redactEvalHubPathSegments(parsed.pathname);
    parsed.search = '';
    parsed.hash = '';
    return parsed.href;
  } catch {
    return REDACTED_SEGMENT;
  }
};

export const sanitizeEvalHubPageContext = (
  page: SegmentPageContext,
  baseOrigin: string,
): SegmentPageContext => ({
  ...page,
  path: page.path === undefined ? undefined : redactEvalHubPathSegments(page.path),
  url: page.url === undefined ? undefined : redactEvalHubUrl(page.url, baseOrigin),
  referrer: page.referrer === undefined ? undefined : redactEvalHubUrl(page.referrer, baseOrigin),
  search: '',
});
