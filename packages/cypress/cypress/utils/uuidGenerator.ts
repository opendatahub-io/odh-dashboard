/**
 * Generates a unique identifier for test runs
 * In GitHub Actions: Uses the first 8 characters of GITHUB_SHA
 * In local environment: Generates a random 6-digit number
 */
export const generateTestUUID = (): string => {
  if (Cypress.env('GITHUB_ACTIONS')) {
    // Use Git SHA from GitHub Actions
    const gitSha = Cypress.env('GITHUB_SHA');
    if (!gitSha) {
      throw new Error('GITHUB_SHA environment variable is not set in GitHub Actions');
    }
    return gitSha.substring(0, 8);
  }
  // Generate random UUID for local runs
  return Cypress._.random(0, 1e6).toString();
};
