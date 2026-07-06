/**
 * Generates a deterministic unique identifier for test runs.
 * The UUID is derived from the spec file path and the CI build number,
 * so it is always the same for a given spec in a given build — no randomness,
 * no caching, no state to lose across cross-origin spec re-evaluations.
 *
 * Jenkins provides BUILD_NUMBER, GitHub Actions provides GITHUB_RUN_ID.
 * Both are injected into Cypress config env at load time (Node-side process.env),
 * which survives cross-origin re-evaluations unlike runtime Cypress.env() calls.
 * Falls back to '0' for local dev.
 */
export const generateTestUUID = (): string => {
  const spec = Cypress.spec.relative;
  const build = Cypress.env('BUILD_NUMBER') || Cypress.env('GITHUB_RUN_ID') || '0';
  const input = `${spec}:${build}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString().slice(0, 6).padStart(6, '0');
};
