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
 * Violations are attributed to the load that raised them. Each load is classified on its
 * own, including a later load of the same URL (see `readDocumentPolicy`), so an
 * authentication or gateway document does not fail a dashboard spec and a dashboard
 * document the spec navigated away from keeps its violations.
 *
 * Adding an allowlist entry is a deliberate act: it documents a known, accepted
 * violation. Entries are `<effective-directive> <blocked-host>`, for example
 * `img-src legacy-images.example.com`.
 */
import { type DocumentWindow, readDocumentPolicy } from '../utils/csp/readDocumentPolicy';
import {
  type CspViolationRecord,
  type DocumentLoad,
  type DocumentLoadStatus,
  beginDocumentLoad,
  describeViolation,
  documentLoadFor,
  documentLoadStatus,
  findUnexpected,
  toAllowlist,
  toRecord,
} from '../utils/csp/violations';

export const CSP_VIOLATION_ALLOWLIST: readonly string[] = [
  // Intentionally empty. Add an entry only with a comment explaining why the
  // violation is acceptable and when it will be removed.
];

export type { CspViolationRecord };

type CapturedViolation = CspViolationRecord & { loadId: number };

const allowlist = toAllowlist(CSP_VIOLATION_ALLOWLIST);

let violations: CapturedViolation[] = [];
let documentLoaded = false;
/** One entry per browser load. A later load of the same URL does not reuse an earlier one. */
let loads: DocumentLoad[] = [];
/** Classification started for a load, settled before that load's violations are judged. */
const loadClassifications = new Map<number, Promise<void>>();
const loadErrors = new Map<number, Error>();
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

before(() => {
  // Everything is per spec. In particular the page may be loaded in a `before` hook, so
  // violations raised during that load are kept for the first test instead of being
  // erased by a per-test reset; `afterEach` clears them once it has inspected them.
  violations = [];
  documentLoaded = false;
  loads = [];
  loadClassifications.clear();
  loadErrors.clear();
  verifiedAnyDocument = false;
});

/**
 * Asserts the recorded violations, then clears them.
 *
 * The clear runs whether the assertion passes or throws. A failed assertion used to
 * leave the records in module state, and a Cypress retry (live end-to-end runs retry
 * twice) then failed again on that same batch. Records captured while a `before` hook
 * loaded the page stay until this assertion consumes them.
 */
const expectNoUnexpectedViolations = (
  records: readonly CspViolationRecord[] = violations,
): void => {
  try {
    const unexpected = findUnexpectedCspViolations(records);
    const message = unexpected.map(describeViolation).join('\n');

    expect(
      unexpected,
      `Unexpected Content-Security-Policy violations:\n${message}\n\n` +
        'Fix the blocked resource or add an explicit, commented entry to ' +
        'CSP_VIOLATION_ALLOWLIST in packages/cypress/cypress/support/cspViolations.ts.',
    ).to.have.length(0);
  } finally {
    violations = [];
  }
};

const originOf = (url: string): string | null => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

type ClassifiableWindow = DocumentWindow & {
  document: { querySelector: (selector: string) => unknown };
};

/**
 * Origin of the dashboard under test. The document that is loaded decides when it is the
 * dashboard shell; otherwise the configured `baseUrl` does. Violations raised by another
 * origin belong to another product's document, whatever document is showing.
 */
const dashboardOrigin = (win: ClassifiableWindow): string | null => {
  const current = originOf(win.location.href);
  if (current && win.document.querySelector('#root')) {
    return current;
  }
  return originOf(String(Cypress.config('baseUrl') ?? '')) ?? current;
};

/**
 * Classifies one load: the dashboard shell (`verified`), another document
 * (`not-a-dashboard-document`), or unreadable (`verification-error`, which never becomes a
 * skip). The caller stores the result on the load. A later load of the same URL is
 * classified again.
 */
const classifyLoad = async (
  win: ClassifiableWindow,
  load: DocumentLoad,
): Promise<DocumentLoadStatus> => {
  const origin = dashboardOrigin(win);
  if (origin && originOf(load.url) !== origin) {
    // A document on another origin is not the dashboard's document and fetching it would
    // be a cross-origin request, so it is classified without being read.
    return 'not-a-dashboard-document';
  }

  const outcome = await readDocumentPolicy(win, load.url);
  if (outcome.status === 'verification-error') {
    // A failed verification must never be treated as an out-of-scope document: doing so
    // would let the spec pass without the header ever being checked.
    throw new Error(
      `The CSP guard could not verify the dashboard document policy: ${outcome.detail}.`,
    );
  }
  return outcome.status;
};

const classificationError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

// Registered before any page script runs, so violations raised during initial load
// (fonts, images, module-federation chunks) are captured too. Each load is classified
// on its own; a later load of the same URL does not reuse the earlier result.
Cypress.on('window:before:load', (win) => {
  documentLoaded = true;
  const load = beginDocumentLoad(loads, win.location.href, win.document);
  if (!Cypress.env('MOCK')) {
    loadClassifications.set(
      load.id,
      classifyLoad(win, load).then(
        (status) => {
          load.status = status;
          if (status === 'verified') {
            verifiedAnyDocument = true;
          }
        },
        (error: unknown) => {
          loadErrors.set(load.id, classificationError(error));
        },
      ),
    );
  }
  win.addEventListener('securitypolicyviolation', (event) => {
    // The listener lives on the window that raised the event, so that window's load is
    // the attribution when the browser omits `documentURI`.
    violations.push({
      ...toRecord(event as SecurityPolicyViolationEvent, win.location.href),
      loadId: load.id,
    });
  });
});

afterEach(() => {
  // Violations belong to the load that raised them. Judge each load from the policy it
  // was served, so an authentication or gateway document cannot fail a dashboard spec and
  // a dashboard document the spec navigated away from keeps its violations.
  if (Cypress.env('MOCK') || !documentLoaded) {
    expectNoUnexpectedViolations();
    return;
  }

  // An empty violation list proves nothing on its own: without a policy the browser never
  // checks anything. Each load was read on its own, including a later load of the same URL.
  cy.window({ log: false }).then(async (win) => {
    await Promise.all(loadClassifications.values());
    const failure = loadErrors.values().next();
    if (!failure.done) {
      loadErrors.clear();
      violations = [];
      throw failure.value;
    }

    // `#root` proves the loaded document is the dashboard shell. If the response read for
    // this load was another document, the session or a replica answered instead, and that
    // response says nothing about the loaded document. The load is matched to its document,
    // not to its URL: client-side navigation rewrites `location.href` without a new load.
    // `loads.at(-1)` covers a document restored without a fresh `window:before:load`.
    const currentLoad = documentLoadFor(loads, win.document) ?? loads.at(-1);
    if (win.document.querySelector('#root') && currentLoad?.status !== 'verified') {
      violations = [];
      throw new Error(
        'The CSP guard could not verify the dashboard document policy: the loaded document ' +
          'is the dashboard shell, but the response read for its URL was not.',
      );
    }

    expectNoUnexpectedViolations(
      violations.filter((violation) => documentLoadStatus(loads, violation.loadId) === 'verified'),
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
