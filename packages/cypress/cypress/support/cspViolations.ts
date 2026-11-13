/**
 * Fails a spec when the application raises a Content-Security-Policy violation that is
 * not on the explicit allowlist, and verifies that the dashboard document actually
 * received a policy so an absent header cannot pass silently.
 *
 * `experimentalCspAllowList: true` keeps the policy instead of stripping it, but Cypress
 * removes or rewrites the directives its instrumentation needs:
 *
 * - always removed: `frame-ancestors`, `navigate-to`, `require-trusted-types-for`,
 *   `sandbox`, `trusted-types`;
 * - removed unless allowed through the option: `child-src`, `default-src`, `frame-src`,
 *   `form-action`, `script-src`, `script-src-elem`.
 *
 * Everything else — `base-uri`, `object-src`, `style-src`, `img-src`, `font-src`,
 * `media-src`, `connect-src`, `worker-src` — is enforced as in production. `frame-src`,
 * `form-action` and `frame-ancestors` coverage therefore comes from the policy parity
 * tests, not from this guard.
 *
 * API-mocked specs run against a static file server that sends no CSP, so they observe no
 * violations and are exempt from the document header check.
 *
 * Violations are attributed to the document that raised them and every document is
 * classified independently (see `readDocumentPolicy`), so an authentication or gateway
 * document does not fail a dashboard spec and a dashboard document the spec navigated away
 * from keeps its violations.
 *
 * Adding an allowlist entry is a deliberate act: it documents a known, accepted
 * violation. Entries are `<effective-directive> <blocked-host>`, for example
 * `img-src legacy-images.example.com`.
 */
import {
  type DocumentPolicyOutcome,
  type DocumentWindow,
  readDocumentPolicy,
} from '../utils/csp/readDocumentPolicy';
import {
  type CspViolationRecord,
  describeViolation,
  documentsOf,
  filterByDocument,
  findUnexpected,
  toAllowlist,
  toRecord,
} from '../utils/csp/violations';

export const CSP_VIOLATION_ALLOWLIST: readonly string[] = [
  // Intentionally empty. Add an entry only with a comment explaining why the
  // violation is acceptable and when it will be removed.
];

export type { CspViolationRecord };

const allowlist = toAllowlist(CSP_VIOLATION_ALLOWLIST);

let violations: CspViolationRecord[] = [];
let documentLoaded = false;
/** Classification per document URL, so each document is fetched and judged once per spec. */
const documentClasses = new Map<string, DocumentPolicyOutcome['status']>();
let verifiedAnyDocument = false;

/** Violations recorded for the current test, before allowlist filtering. */
export const getCapturedCspViolations = (): readonly CspViolationRecord[] => violations;

/** Drops the recorded violations, for a spec that raises a deliberate one. */
export const clearCapturedCspViolations = (
  predicate: (violation: CspViolationRecord) => boolean = () => true,
): void => {
  violations = violations.filter((violation) => !predicate(violation));
};

/** The subset of violations that fails the guard. */
export const findUnexpectedCspViolations = (
  records: readonly CspViolationRecord[] = violations,
): CspViolationRecord[] => findUnexpected(records, allowlist);

export { readDocumentPolicy };

// Registered before any page script runs, so violations raised during initial load
// (fonts, images, module-federation chunks) are captured too.
Cypress.on('window:before:load', (win) => {
  documentLoaded = true;
  win.addEventListener('securitypolicyviolation', (event) => {
    // The listener lives on the window that raised the event, so that window is also the
    // fallback attribution when the browser omits `documentURI`.
    violations.push(toRecord(event as SecurityPolicyViolationEvent, win.location.href));
  });
});

before(() => {
  // Everything is per spec. In particular the page may be loaded in a `before` hook, so
  // violations raised during that load are kept for the first test instead of being
  // erased by a per-test reset; `afterEach` clears them once it has inspected them.
  violations = [];
  documentLoaded = false;
  documentClasses.clear();
  verifiedAnyDocument = false;
});

/** Asserts the recorded violations, then clears them. */
const expectNoUnexpectedViolations = (
  records: readonly CspViolationRecord[] = violations,
): void => {
  const unexpected = findUnexpectedCspViolations(records);
  const message = unexpected.map(describeViolation).join('\n');

  expect(
    unexpected,
    `Unexpected Content-Security-Policy violations:\n${message}\n\n` +
      'Fix the blocked resource or add an explicit, commented entry to ' +
      'CSP_VIOLATION_ALLOWLIST in packages/cypress/cypress/support/cspViolations.ts.',
  ).to.have.length(0);

  // Cleared only after the assertion above, so violations captured while a `before` hook
  // loaded the page fail the first test rather than disappearing before it starts.
  violations = [];
};

const originOf = (url: string): string | null => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

/**
 * Origin of the dashboard under test. The document that is loaded decides when it is the
 * dashboard shell; otherwise the configured `baseUrl` does. Violations raised by another
 * origin belong to another product's document, whatever document is showing.
 */
const dashboardOrigin = (win: Window): string | null => {
  const current = originOf(win.location.href);
  if (current && win.document.querySelector('#root')) {
    return current;
  }
  return originOf(String(Cypress.config('baseUrl') ?? '')) ?? current;
};

/**
 * Classifies one document: the dashboard shell (`verified`), another document
 * (`not-a-dashboard-document`) or unreadable (`verification-error`, which never becomes a
 * skip). Results are cached so each document is read once per spec.
 */
const classifyDocument = async (
  win: DocumentWindow,
  url: string,
  origin: string | null,
): Promise<void> => {
  if (documentClasses.has(url)) {
    return;
  }
  if (origin && originOf(url) !== origin) {
    // A document on another origin is not the dashboard's document and fetching it would
    // be a cross-origin request, so it is classified without being read.
    documentClasses.set(url, 'not-a-dashboard-document');
    return;
  }
  const outcome = await readDocumentPolicy(win, url);
  if (outcome.status === 'verification-error') {
    // A failed verification must never be treated as an out-of-scope document: doing so
    // would let the spec pass without the header ever being checked.
    throw new Error(
      `The CSP guard could not verify the dashboard document policy: ${outcome.detail}.`,
    );
  }
  documentClasses.set(url, outcome.status);
  if (outcome.status === 'verified') {
    verifiedAnyDocument = true;
  }
};

afterEach(() => {
  // Violations belong to the document that raised them, and the listener attaches to every
  // window the spec opens. Classify every document first and assert violations only for the
  // ones the policy covers, so an authentication or gateway document cannot fail a dashboard
  // spec and a dashboard document the spec navigated away from keeps its violations.
  if (Cypress.env('MOCK') || !documentLoaded) {
    expectNoUnexpectedViolations();
    return;
  }

  // An empty violation list proves nothing on its own: without a policy the browser never
  // checks anything. Verify once per document, on a real (non-mocked) deployment, that the
  // dashboard document carried a policy.
  cy.window({ log: false }).then(async (win) => {
    const origin = dashboardOrigin(win);
    for (const url of [win.location.href, ...documentsOf(violations)]) {
      await classifyDocument(win, url, origin);
    }

    // `#root` proves the loaded document is the dashboard shell. If the response read for
    // its URL was another document, the session or a replica answered instead, and that
    // response says nothing about the loaded document.
    if (
      win.document.querySelector('#root') &&
      documentClasses.get(win.location.href) !== 'verified'
    ) {
      throw new Error(
        'The CSP guard could not verify the dashboard document policy: the loaded document ' +
          'is the dashboard shell, but the response read for its URL was not.',
      );
    }

    expectNoUnexpectedViolations(
      filterByDocument(violations, (url) => documentClasses.get(url) === 'verified'),
    );
  });
});

after(() => {
  // Diagnostic only. A verification failure already fails the spec in `afterEach`; this
  // reports the remaining silent case, where the document that loaded was never the
  // dashboard shell, so the guard proved nothing for this spec.
  if (Cypress.env('MOCK') || !documentLoaded || verifiedAnyDocument) {
    return;
  }
  // eslint-disable-next-line no-console
  console.warn(
    'CSP guard: this spec never verified a dashboard Content-Security-Policy header. ' +
      'The document that loaded was not the dashboard shell (or was never read), so the ' +
      'violation guard could not prove a policy was applied.',
  );
});
