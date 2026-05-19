const NETWORK_POLICY_PREFIX = 'allow-cy-e2e-autorag';

/**
 * Extract the namespace from a Kubernetes in-cluster service URL.
 * e.g. "http://ogx-service.ogx-ns.svc.cluster.local:8321" → "ogx-ns"
 *
 * Returns undefined if the URL doesn't match the expected pattern.
 */
const extractNamespaceFromServiceUrl = (url: string): string | undefined => {
  const match = url.match(/\/\/[^.]+\.([^.]+)\.svc\.cluster\.local/);
  return match?.[1];
};

/**
 * Resolve the OGX namespace from an explicit parameter,
 * the OGX_URL env var, or fall back to 'llama-stack'.
 */
const resolveOgxNamespace = (ogxNamespace?: string): string => {
  if (ogxNamespace) {
    return ogxNamespace;
  }
  const url = Cypress.env('OGX_URL') as string | undefined;
  if (url) {
    const ns = extractNamespaceFromServiceUrl(url);
    if (ns) {
      return ns;
    }
  }
  return 'llama-stack';
};

/**
 * Check whether NetworkPolicies exist in the given namespace.
 * If none exist, the cluster isn't enforcing them and we can skip creation.
 */
const hasNetworkPolicies = (namespace: string): Cypress.Chainable<boolean> =>
  cy
    .exec(`oc get networkpolicy -n ${namespace} --no-headers 2>/dev/null | wc -l`, {
      failOnNonZeroExit: false,
    })
    .then((result) => parseInt(result.stdout.trim(), 10) > 0);

/**
 * Clean up stale NetworkPolicies left behind by previous test runs that
 * crashed before their after() hook could run.
 */
const cleanupStaleNetworkPolicies = (ogxNs: string): Cypress.Chainable<Cypress.Exec> =>
  cy.exec(
    `oc get networkpolicy -n ${ogxNs} -o name 2>/dev/null` +
      ` | grep '${NETWORK_POLICY_PREFIX}'` +
      ` | xargs -r oc delete -n ${ogxNs} --ignore-not-found`,
    { failOnNonZeroExit: false },
  );

/**
 * Create a NetworkPolicy in the OGX namespace that allows pipeline
 * pods in the given test namespace to reach OGX on port 8321.
 *
 * Skips creation if no existing NetworkPolicies in the OGX namespace.
 * Also cleans up stale policies from previous runs.
 *
 * @param namespace - The test project namespace that needs access
 * @param ogxNs - Optional OGX namespace override (derived from OGX_URL if not provided)
 */
export const allowOgxAccess = (
  namespace: string,
  ogxNs?: string,
): Cypress.Chainable<Cypress.Exec> => {
  const resolvedNs = resolveOgxNamespace(ogxNs);
  cy.step(`Allow OGX access from ${namespace} to ${resolvedNs}`);

  return hasNetworkPolicies(resolvedNs).then((enforced) => {
    if (!enforced) {
      cy.log(`No NetworkPolicies in ${resolvedNs}, skipping creation`);
      return cy.exec('echo "No NetworkPolicies enforced"');
    }

    return cleanupStaleNetworkPolicies(resolvedNs).then(() =>
      cy.exec(
        `cat <<'EOF' | oc apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ${NETWORK_POLICY_PREFIX}-${namespace}
  namespace: ${resolvedNs}
spec:
  podSelector:
    matchLabels:
      app: llama-stack
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: ${namespace}
    ports:
    - port: 8321
      protocol: TCP
  policyTypes:
  - Ingress
EOF`,
      ),
    );
  });
};

/**
 * Remove the NetworkPolicy that allowed the test namespace to reach OGX.
 *
 * @param namespace - The test project namespace
 * @param ogxNs - Optional OGX namespace override
 */
export const removeOgxAccess = (
  namespace: string,
  ogxNs?: string,
): Cypress.Chainable<Cypress.Exec> => {
  const resolvedNs = resolveOgxNamespace(ogxNs);
  cy.step(`Remove OGX access for ${namespace}`);
  return cy.exec(
    `oc delete networkpolicy ${NETWORK_POLICY_PREFIX}-${namespace} -n ${resolvedNs} --ignore-not-found`,
  );
};
