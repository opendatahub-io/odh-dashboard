/**
 * Create a Kubernetes secret with LlamaStack connection credentials.
 *
 * The secret contains LLAMA_STACK_CLIENT_BASE_URL and LLAMA_STACK_CLIENT_API_KEY,
 * which are the required keys for the AutoRAG BFF to connect to a LlamaStack instance.
 *
 * @param namespace Namespace to create the secret in
 * @param secretName Name for the secret
 * @param baseUrl LlamaStack base URL (e.g. https://llamastack.apps.cluster.com)
 * @param apiKey LlamaStack API key
 */
export const createLlamaStackSecret = (
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
