/**
 * Generates a unique identifier for test runs.
 * Uses Cypress.env() to cache the UUID in the runner process rather than
 * module scope — module-scope variables are reset when cy.visitWithLogin()
 * triggers a cross-origin redirect that re-evaluates the spec file.
 * The UUID is scoped per spec file via Cypress.spec.relative so that
 * sequential specs in the same worker each get their own value.
 *
 * In GitHub Actions: Uses the first 8 characters of GITHUB_SHA
 * In local environment: Generates a random 6-digit number (cached per spec)
 */
export const generateTestUUID = (): string => {
  if (Cypress.env('GITHUB_ACTIONS')) {
    const gitSha = Cypress.env('GITHUB_SHA');
    if (!gitSha) {
      throw new Error('GITHUB_SHA environment variable is not set in GitHub Actions');
    }
    return gitSha.substring(0, 8);
  }
  const currentSpec = Cypress.spec.relative;
  if (Cypress.env('TEST_UUID_SPEC') !== currentSpec) {
    const uuid = Math.random().toString().slice(2, 8);
    Cypress.env('TEST_UUID', uuid);
    Cypress.env('TEST_UUID_SPEC', currentSpec);
  }
  return Cypress.env('TEST_UUID') as string;
};
