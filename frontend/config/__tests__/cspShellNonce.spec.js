const fs = require('fs');
const path = require('path');
const { CSP_NONCE_PLACEHOLDER } = require('@odh-dashboard/app-config/security-policy');

const REPO_ROOT = path.resolve(__dirname, '../../..');

/**
 * Every shell served with the dashboard policy. A shell may have no inline script at all
 * (core-bff and mlflow set the Felt class on <html> instead), but any executing inline
 * script it does have must carry the nonce placeholder the servers substitute.
 */
const SHELLS = [
  'frontend/src/index.html',
  'distributions/base/src/index.html',
  'distributions/rhaii/src/index.html',
  'distributions/maas-portal/src/index.html',
  'distributions/core-bff/frontend/src/index.html',
  'packages/mlflow/frontend/src/index.html',
];

/** Inline <script> elements that the browser executes; JSON data blocks are not executed. */
const executingInlineScripts = (html) =>
  [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)].filter(
    ([, attributes]) => !/\btype\s*=\s*["']application\/json["']/i.test(attributes),
  );

describe('shell inline scripts and the CSP nonce', () => {
  it.each(SHELLS)('%s gives every executing inline script the nonce placeholder', (shell) => {
    const html = fs.readFileSync(path.join(REPO_ROOT, shell), 'utf8');

    executingInlineScripts(html).forEach(([, attributes]) => {
      expect(attributes).toContain(`nonce="${CSP_NONCE_PLACEHOLDER}"`);
    });
  });

  it.each(SHELLS)('%s does not hardcode a nonce value', (shell) => {
    const html = fs.readFileSync(path.join(REPO_ROOT, shell), 'utf8');

    executingInlineScripts(html).forEach(([tag]) => {
      const nonce = /nonce="([^"]*)"/.exec(tag)?.[1];
      if (nonce !== undefined) {
        expect(nonce).toBe(CSP_NONCE_PLACEHOLDER);
      }
    });
  });
});
