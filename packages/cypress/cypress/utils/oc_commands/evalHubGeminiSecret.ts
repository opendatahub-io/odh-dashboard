import type { CommandLineResult } from '../../types';

const requireApplicationsNamespace = (): string => {
  const ns = Cypress.env('APPLICATIONS_NAMESPACE') as string | undefined;
  if (!ns) {
    throw new Error(
      'APPLICATIONS_NAMESPACE is not configured. Set CY_TEST_CONFIG to point to your test-variables.yml file.',
    );
  }
  return ns;
};

/**
 * Reads a single base64-encoded key from an opaque Secret (same encoding as `oc create secret --from-literal`).
 */
export const readOpaqueSecretDataKey = (
  namespace: string,
  secretName: string,
  dataKey: string,
): Cypress.Chainable<string> => {
  const cmd = `oc get secret "${secretName}" -n "${namespace}" -o json`;
  return cy.exec(cmd, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.exitCode !== 0) {
      const detail = result.stderr.trim() || result.stdout;
      throw new Error(
        `Could not read Secret "${secretName}" in namespace "${namespace}": ${detail}`,
      );
    }
    const parsed = JSON.parse(result.stdout) as { data?: Record<string, string> };
    const b64 = parsed.data?.[dataKey];
    if (!b64?.length) {
      throw new Error(
        `Secret "${secretName}" in "${namespace}" has no data key "${dataKey}". Example: oc create secret generic ${secretName} --from-literal=${dataKey}='<value>' -n ${namespace}`,
      );
    }
    const value = Buffer.from(b64, 'base64').toString('utf8').trim();
    if (!value) {
      throw new Error(`Decoded key "${dataKey}" in Secret "${secretName}" is empty.`);
    }
    return cy.wrap(value);
  });
};

export type ReadGeminiApiKeyFromClusterOptions = {
  namespace?: string;
  secretName?: string;
  dataKey?: string;
};

/**
 * Gemini API key for Eval Hub E2E: stored in-cluster (not Cypress env).
 * Default: Secret `geminiapikey`, key `api-key`, in `APPLICATIONS_NAMESPACE`.
 */
export const readGeminiApiKeyFromCluster = (
  options?: ReadGeminiApiKeyFromClusterOptions,
): Cypress.Chainable<string> => {
  const namespace = options?.namespace ?? requireApplicationsNamespace();
  const secretName = options?.secretName ?? 'geminiapikey';
  const dataKey = options?.dataKey ?? 'api-key';
  return readOpaqueSecretDataKey(namespace, secretName, dataKey);
};
