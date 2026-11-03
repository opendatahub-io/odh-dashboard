/**
 * Fails a spec when the application raises a Content-Security-Policy violation that
 * is not on the explicit allowlist.
 *
 * The dashboard serves an enforcing CSP, and `experimentalCspAllowList: true` keeps
 * Cypress from stripping it. Cypress relaxes `script-src`/`default-src` for its own
 * instrumentation; every other directive is enforced exactly as in production. A
 * directive regression therefore fails here instead of at a customer deployment.
 *
 * Adding an entry is a deliberate act: it documents a known, accepted violation.
 * Entries are `<effective-directive> <blocked-host>`, for example
 * `img-src legacy-images.example.com`.
 */
export const CSP_VIOLATION_ALLOWLIST: readonly string[] = [
  // Intentionally empty. Add an entry only with a comment explaining why the
  // violation is acceptable and when it will be removed.
];

type CspViolationRecord = {
  effectiveDirective: string;
  blockedURI: string;
  blockedHost: string;
  sourceFile: string;
};

/** Sources that have no host and are reported by the token the browser uses. */
const NON_NETWORK_SCHEMES = ['inline', 'eval', 'wasm-eval', 'data', 'blob', 'filesystem'];

const hostFromURI = (blockedURI: string): string => {
  if (!blockedURI) {
    return 'unknown';
  }
  const scheme = blockedURI.split(':')[0].toLowerCase();
  if (NON_NETWORK_SCHEMES.includes(scheme)) {
    return scheme;
  }
  try {
    return new URL(blockedURI).host;
  } catch {
    return blockedURI.split(/[?#]/)[0];
  }
};

const toRecord = (event: SecurityPolicyViolationEvent): CspViolationRecord => ({
  effectiveDirective: event.effectiveDirective || event.violatedDirective || 'unknown',
  blockedURI: event.blockedURI,
  blockedHost: hostFromURI(event.blockedURI),
  sourceFile: event.sourceFile,
});

const allowlist = new Set(CSP_VIOLATION_ALLOWLIST.map((entry) => entry.trim()));

const isAllowlisted = (violation: CspViolationRecord): boolean =>
  allowlist.has(`${violation.effectiveDirective} ${violation.blockedHost}`);

let violations: CspViolationRecord[] = [];

// Registered before any page script runs, so violations raised during initial load
// (fonts, images, module-federation chunks) are captured too.
Cypress.on('window:before:load', (win) => {
  win.addEventListener('securitypolicyviolation', (event) => {
    violations.push(toRecord(event as SecurityPolicyViolationEvent));
  });
});

beforeEach(() => {
  violations = [];
});

afterEach(() => {
  const unexpected = violations.filter((violation) => !isAllowlisted(violation));
  const message = unexpected
    .map(
      (violation) =>
        `${violation.effectiveDirective} blocked ${violation.blockedURI} (source: ${
          violation.sourceFile || 'n/a'
        })`,
    )
    .join('\n');

  expect(
    unexpected,
    `Unexpected Content-Security-Policy violations:\n${message}\n\n` +
      'Fix the blocked resource or add an explicit, commented entry to ' +
      'CSP_VIOLATION_ALLOWLIST in packages/cypress/cypress/support/cspViolations.ts.',
  ).to.have.length(0);
});
