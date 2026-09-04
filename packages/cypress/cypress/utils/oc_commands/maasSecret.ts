/**
 * Create a Kubernetes secret with MaaS connection credentials.
 *
 * The secret contains MAAS_BASE_URL and MAAS_API_KEY, which AutoRAG uses
 * after RHOAIENG-89370. The URL may still point at an OGX/Llama Stack
 * distribution; only the secret key names changed.
 */
export const createMaasSecret = (
  namespace: string,
  secretName: string,
  baseUrl: string,
  apiKey: string,
): void => {
  const escapeShellSingleQuote = (s: string) => s.replace(/'/g, "'\\''");

  cy.exec(
    `oc create secret generic ${secretName} -n ${namespace} ` +
      `--from-literal=MAAS_BASE_URL='${escapeShellSingleQuote(baseUrl)}' ` +
      `--from-literal=MAAS_API_KEY='${escapeShellSingleQuote(apiKey)}'`,
    { failOnNonZeroExit: true, log: false },
  );
};

/**
 * External MaaS/OGX URL for AutoRAG E2E. Prefers MAAS_URL, then OGX_URL.
 */
export const getExternalMaasConnection = (): { url: string; apiKey: string } | undefined => {
  const url = (Cypress.env('MAAS_URL') as string) || (Cypress.env('OGX_URL') as string);
  if (!url) {
    return undefined;
  }
  const apiKey =
    (Cypress.env('MAAS_API_KEY') as string) || (Cypress.env('OGX_API_KEY') as string) || '';
  return { url, apiKey };
};

export const isExternalMaasConnection = (): boolean => !!getExternalMaasConnection();
