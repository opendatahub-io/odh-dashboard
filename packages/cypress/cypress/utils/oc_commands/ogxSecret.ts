/**
 * Create a Kubernetes secret with OGX connection credentials.
 *
 * The secret contains LLAMA_STACK_CLIENT_BASE_URL and LLAMA_STACK_CLIENT_API_KEY,
 * which are the required keys for the AutoRAG BFF to connect to an OGX instance.
 * (Key names are an API contract with the BFF pipeline and must not be renamed.)
 *
 * @param namespace Namespace to create the secret in
 * @param secretName Name for the secret
 * @param baseUrl OGX base URL (e.g. https://ogx.apps.cluster.com)
 * @param apiKey OGX API key
 */
export const createOgxSecret = (
  namespace: string,
  secretName: string,
  baseUrl: string,
  apiKey: string,
): void => {
  const escapeShellSingleQuote = (s: string) => s.replace(/'/g, "'\\''");

  cy.exec(
    `oc create secret generic ${secretName} -n ${namespace} ` +
      `--from-literal=LLAMA_STACK_CLIENT_BASE_URL='${escapeShellSingleQuote(baseUrl)}' ` +
      `--from-literal=LLAMA_STACK_CLIENT_API_KEY='${escapeShellSingleQuote(apiKey)}'`,
    { failOnNonZeroExit: true, log: false },
  );
};
