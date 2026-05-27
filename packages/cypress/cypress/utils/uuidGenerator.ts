let cachedUUID: string | null = null;

/**
 * Generates a unique identifier for test runs.
 * The result is cached per spec file (module scope) so retries reuse the same
 * UUID and don't orphan namespaces created on previous attempts.
 *
 * In GitHub Actions: Uses the first 8 characters of GITHUB_SHA
 * In local environment: Generates a random 6-digit number (cached on first call)
 */
export const generateTestUUID = (): string => {
  if (Cypress.env('GITHUB_ACTIONS')) {
    const gitSha = Cypress.env('GITHUB_SHA');
    if (!gitSha) {
      throw new Error('GITHUB_SHA environment variable is not set in GitHub Actions');
    }
    return gitSha.substring(0, 8);
  }
  if (cachedUUID === null) {
    cachedUUID = Cypress._.random(0, 1e6).toString();
  }
  return cachedUUID;
};
