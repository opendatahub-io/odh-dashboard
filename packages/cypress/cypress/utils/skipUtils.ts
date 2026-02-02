/**
 * Utility functions for conditionally skipping tests based on cluster configuration.
 */

/**
 * Checks if the current cluster is a BYOIDC (Bring Your Own Identity Provider) cluster.
 * BYOIDC clusters use external identity providers (like Keycloak) instead of LDAP/htpasswd.
 *
 * @returns boolean indicating if CLUSTER_AUTH is set to 'oidc'
 */
export const isBYOIDCCluster = (): boolean => Cypress.env('CLUSTER_AUTH') === 'oidc';

/**
 * Skips all tests in a describe block if running on a BYOIDC cluster.
 * Call this at the top level of your describe block (not inside before/beforeEach).
 *
 * IMPORTANT: This must be called BEFORE any before() hooks in your describe block
 * to ensure the before() setup is also skipped.
 *
 * @param reason - Optional custom reason for skipping
 *
 * @example
 * describe('Tests requiring LDAP', () => {
 *   skipSuiteIfBYOIDC();
 *
 *   before(() => { ... });
 *   it('test 1', () => { ... });
 *   it('test 2', () => { ... });
 * });
 */
export const skipSuiteIfBYOIDC = (
  reason = 'This test suite is not supported on BYOIDC clusters.',
): void => {
  // Skip the before() hook setup on BYOIDC clusters
  // IMPORTANT: Do NOT use any cy commands before this.skip() - it causes promise conflicts
  before(function skipSetupOnBYOIDC() {
    if (isBYOIDCCluster()) {
      // eslint-disable-next-line no-console
      console.log(`[SKIP] ${reason}`);
      this.skip();
    }
  });

  // Skip each individual test on BYOIDC clusters
  beforeEach(function skipOnBYOIDC() {
    if (isBYOIDCCluster()) {
      this.skip();
    }
  });
};

/**
 * Skips the current test if running on a BYOIDC cluster.
 * Must be called at the beginning of a test function (not an arrow function).
 *
 * @param context - The Mocha test context (`this` from within a test function)
 * @param reason - Optional custom reason for skipping (defaults to LDAP users message)
 *
 * @example
 * it('Test that requires LDAP users', function () {
 *   skipIfBYOIDC(this);
 *   // ... test code
 * });
 *
 * @example
 * it('Test with custom skip reason', function () {
 *   skipIfBYOIDC(this, 'Custom OIDC-related skip reason');
 *   // ... test code
 * });
 */
export const skipIfBYOIDC = (
  context: Mocha.Context,
  reason = 'This test is not fully supported on BYOIDC clusters.',
): void => {
  if (isBYOIDCCluster()) {
    // IMPORTANT: Do NOT use any cy commands before context.skip() - it causes promise conflicts
    // eslint-disable-next-line no-console
    console.log(`[SKIP] ${reason}`);
    context.skip();
  }
};
