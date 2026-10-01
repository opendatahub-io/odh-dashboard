/**
 * Create a Kubernetes secret with MaaS connection credentials.
 *
 * The secret contains MAAS_BASE_URL and MAAS_API_KEY, which AutoRAG uses
 * after RHOAIENG-89370.
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
      `--from-literal=MAAS_API_KEY='${escapeShellSingleQuote(apiKey)}' ` +
      `--dry-run=client -o json | oc apply -f -`,
    { failOnNonZeroExit: true, log: false },
  );
  cy.exec(
    `oc annotate secret ${secretName} -n ${namespace} ` +
      `openshift.io/display-name=${secretName} ` +
      `opendatahub.io/connection-type=maas --overwrite && ` +
      `oc label secret ${secretName} -n ${namespace} ` +
      `opendatahub.io/dashboard=true opendatahub.io/secret-type=maas --overwrite`,
    { failOnNonZeroExit: true, log: false },
  );
};

export const getMaasConnection = (): { url: string; apiKey: string } => {
  const url = Cypress.env('MAAS_URL') as string | undefined;
  const apiKey = Cypress.env('MAAS_API_KEY') as string | undefined;
  if (!url || !apiKey) {
    throw new Error('AutoRAG requires MAAS_URL and MAAS_API_KEY to be configured.');
  }
  return { url, apiKey };
};
