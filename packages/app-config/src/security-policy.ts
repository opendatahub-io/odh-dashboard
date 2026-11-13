/**
 * The dashboard's Content Security Policy, defined once.
 *
 * Consumed by:
 * - the Node backend, which serves it on HTML documents;
 * - the rspack dev server, which serves it as Report-Only with the declared dev delta.
 *
 * The Go core-bff cannot import TypeScript, so it keeps one literal mirror asserted by
 * `backend/src/utils/__tests__/securityHeaders.spec.ts`:
 * `distributions/core-bff/bff/internal/constants/headers.go`.
 *
 * Keep this entrypoint dependency-free: it is loaded from a plain CommonJS rspack config
 * through Node's native type stripping, which requires relative imports to carry explicit
 * extensions. A leaf module avoids that constraint entirely.
 */

/**
 * The only third-party origin the dashboard loads from. It mirrors the hardcoded
 * `cdnURL` / `apiHost` in `packages/analytics/src/initSegment.ts` — the Segment SDK is
 * loaded as a remote script from this origin, and events are sent to it. Update all
 * three constants together if the Segment endpoint ever moves.
 */
export const SEGMENT_TELEMETRY_ORIGIN = 'https://console.redhat.com';

/** One CSP directive and its space-separated source list. Order is significant. */
export type CspDirective = readonly [name: string, value: string];

/**
 * `Content-Security-Policy` directives for HTML responses. Each directive and the
 * allowances it makes are explained in `docs/content-security-policy.md`; the inline
 * notes below cover the non-obvious allowances. Narrow one only after checking what
 * depends on it.
 */
export const CONTENT_SECURITY_POLICY_DIRECTIVES: ReadonlyArray<CspDirective> = [
  ['default-src', "'self'"],
  ['base-uri', "'self'"],
  ['object-src', "'none'"],
  // Segment loads its bundle from the telemetry origin rather than bundling it.
  ['script-src', `'self' ${SEGMENT_TELEMETRY_ORIGIN}`],
  // CSS-in-JS in module frontends and Monaco inject styles at runtime.
  ['style-src', "'self' 'unsafe-inline'"],
  // `https:`/`blob:` cover remote media in rendered markdown and gen-ai object URLs.
  ['img-src', "'self' https: data: blob:"],
  ['font-src', "'self' data:"],
  ['media-src', "'self' https: data: blob:"],
  ['connect-src', `'self' ${SEGMENT_TELEMETRY_ORIGIN}`],
  // Artifact previews embed a presigned object-storage URL from the KFP API.
  ['frame-src', "'self' https:"],
  ['form-action', "'self'"],
  // Monaco and similar editors start workers from the same origin or `blob:` URLs.
  ['worker-src', "'self' blob:"],
  ['frame-ancestors', "'none'"],
];

/** Serializes directives into a header value. */
export const serializeContentSecurityPolicy = (directives: ReadonlyArray<CspDirective>): string =>
  directives.map(([directive, value]) => `${directive} ${value}`).join('; ');

/** Serialized `Content-Security-Policy` header value. */
export const CONTENT_SECURITY_POLICY = serializeContentSecurityPolicy(
  CONTENT_SECURITY_POLICY_DIRECTIVES,
);
