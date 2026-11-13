/**
 * Reads the policy delivered with a document of the application.
 *
 * `documentUrl` defaults to the document the window is showing, and is also passed for a
 * document a spec navigated away from so each document can be classified independently.
 * The fetch reuses the browser's session, so the response is the document that URL serves.
 * Auth-proxy and gateway documents in front of the application carry no policy and are
 * outside its scope (see docs/content-security-policy.md), so only responses that contain
 * the dashboard root are treated as the dashboard document.
 *
 * The three outcomes are kept distinct on purpose: collapsing a failed verification into
 * "not the dashboard document" would let a spec pass without ever checking a policy, which
 * is exactly what this guard exists to prevent.
 */
export type DocumentPolicyOutcome =
  /** The dashboard shell, carrying a non-empty policy header. */
  | { status: 'verified'; policy: string }
  /** A document outside the dashboard policy boundary, or not a document at all. */
  | { status: 'not-a-dashboard-document'; detail: string }
  /** The dashboard shell could not be read, or it carried no policy. Never a skip. */
  | { status: 'verification-error'; detail: string };

/** The part of a browser window this reads; `Cypress.AUTWindow` satisfies it. */
export type DocumentWindow = {
  location: { href: string };
  fetch: typeof fetch;
};

const isDashboardShell = (html: string): boolean => html.includes('id="root"');

export const readDocumentPolicy = async (
  win: DocumentWindow,
  documentUrl: string = win.location.href,
): Promise<DocumentPolicyOutcome> => {
  let response: Response;
  let html: string;
  try {
    response = await win.fetch(documentUrl, {
      credentials: 'same-origin',
      headers: { Accept: 'text/html' },
    });
    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
    if (!contentType.includes('text/html')) {
      return {
        status: 'not-a-dashboard-document',
        detail: `the response was ${contentType || 'untyped'}, not HTML`,
      };
    }
    html = await response.text();
  } catch (error) {
    return {
      status: 'verification-error',
      detail: `fetching ${documentUrl} failed: ${String(error)}`,
    };
  }

  if (!isDashboardShell(html)) {
    return {
      status: 'not-a-dashboard-document',
      detail: 'the document does not contain the dashboard root element',
    };
  }

  const policy =
    response.headers.get('content-security-policy') ??
    response.headers.get('content-security-policy-report-only');
  if (!policy) {
    return {
      status: 'verification-error',
      detail: 'the dashboard document carried no Content-Security-Policy header',
    };
  }

  return { status: 'verified', policy };
};
