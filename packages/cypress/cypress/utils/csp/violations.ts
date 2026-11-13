/**
 * Normalisation and filtering for Content-Security-Policy violations.
 *
 * Kept free of Cypress globals so the classification rules — which decide whether a
 * violation fails a spec — can be unit tested without a browser.
 */
export type CspViolationRecord = {
  effectiveDirective: string;
  blockedURI: string;
  blockedHost: string;
  sourceFile: string;
  /** The document that raised the violation. Every violation is attributed to its origin. */
  documentURI: string;
};

/** Sources that have no host and are reported by the token the browser uses. */
const NON_NETWORK_SCHEMES = ['inline', 'eval', 'wasm-eval', 'data', 'blob', 'filesystem'];

export const hostFromURI = (blockedURI: string): string => {
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

export const toRecord = (
  event: SecurityPolicyViolationEvent,
  fallbackDocumentURI = '',
): CspViolationRecord => ({
  effectiveDirective: event.effectiveDirective || event.violatedDirective || 'unknown',
  blockedURI: event.blockedURI,
  blockedHost: hostFromURI(event.blockedURI),
  sourceFile: event.sourceFile,
  documentURI: event.documentURI || fallbackDocumentURI,
});

/** The distinct documents that raised the supplied violations, in first-seen order. */
export const documentsOf = (records: readonly CspViolationRecord[]): string[] => [
  ...new Set(records.map((record) => record.documentURI)),
];

/** The violations raised by documents the predicate covers. */
export const filterByDocument = (
  records: readonly CspViolationRecord[],
  covers: (documentURI: string) => boolean,
): CspViolationRecord[] => records.filter((record) => covers(record.documentURI));

/** Entries are `<effective-directive> <blocked-host>`. */
export const toAllowlist = (entries: readonly string[]): ReadonlySet<string> =>
  new Set(entries.map((entry) => entry.trim()));

export const isAllowlisted = (
  violation: CspViolationRecord,
  allowlist: ReadonlySet<string>,
): boolean => allowlist.has(`${violation.effectiveDirective} ${violation.blockedHost}`);

export const findUnexpected = (
  records: readonly CspViolationRecord[],
  allowlist: ReadonlySet<string>,
): CspViolationRecord[] => records.filter((violation) => !isAllowlisted(violation, allowlist));

export const describeViolation = (violation: CspViolationRecord): string =>
  `${violation.effectiveDirective} blocked ${violation.blockedURI} (source: ${
    violation.sourceFile || 'n/a'
  })`;
