import type { CommandLineResult } from '#~/__tests__/cypress/cypress/types';

/**
 * Check for specific tolerations in a pod across all namespaces.
 *
 * @param podNameContains A substring to partially match against the pod name (e.g., "jupyter-nb").
 * @param expectedToleration The toleration to look for in the pod spec.
 * @param namespace The namespace to search for the pod. Defaults to `-A` for all namespaces, or can specify a specific namespace with `-n <namespace>`.
 * @returns A Cypress chainable that checks for the specified toleration.
 */
export const checkNotebookTolerations = (
  podNameContains: string,
  expectedToleration: { key: string; operator: string; effect: string },
  namespace?: string,
): Cypress.Chainable<Cypress.Exec> => {
  const namespaceFlag = namespace ? `-n ${namespace}` : '-A';

  // Find pods
  const findPodsCommand = `oc get pods ${namespaceFlag} -o custom-columns="NAMESPACE:.metadata.namespace,NAME:.metadata.name" --no-headers | grep ${podNameContains}`;
  cy.log(`Finding pods with command: ${findPodsCommand}`);

  return cy
    .exec(findPodsCommand, { failOnNonZeroExit: false })
    .then((result: CommandLineResult) => {
      const pods = result.stdout
        .trim()
        .split('\n')
        .map((line) => {
          const parsedResult = line.trim().split(/\s+/);
          if (parsedResult.length === 2) {
            const [podNamespace, podName] = parsedResult;
            cy.log(`Parsed: namespace = ${podNamespace}, podName = ${podName}`);
            return { namespace: podNamespace, name: podName };
          }
          cy.log(`Error parsing line: "${line}"`);
          return null;
        })
        .filter((pod): pod is { namespace: string; name: string } => pod !== null);

      cy.log(`Found ${pods.length} matching pods`);

      if (pods.length === 0) {
        throw new Error('No matching pods found');
      }

      // Check tolerations for each matching pod
      pods.forEach((pod) => {
        const { namespace: podNamespace, name: podName } = pod;

        const getPodCommand = `oc get pod/${podName} -n ${podNamespace} -o json`;
        cy.log(`Executing command: ${getPodCommand}`);

        cy.exec(getPodCommand, { failOnNonZeroExit: false }).then(
          (podResult: CommandLineResult) => {
            if (podResult.code !== 0) {
              throw new Error(`Failed to get pod details: ${podResult.stderr}`);
            }

            const podSpec = JSON.parse(podResult.stdout);
            const tolerations = podSpec.spec.tolerations || [];

            cy.log(`Found tolerations: ${JSON.stringify(tolerations)}`);

            const tolerationExists = tolerations.some(
              (t: { key: string; operator: string; effect: string }) =>
                t.key === expectedToleration.key &&
                t.operator === expectedToleration.operator &&
                t.effect === expectedToleration.effect,
            );

            if (!tolerationExists) {
              throw new Error(
                `Expected toleration ${JSON.stringify(
                  expectedToleration,
                )} not found in pod "${podName}" in namespace "${podNamespace}".\n` +
                  `Found tolerations: ${JSON.stringify(tolerations)}`,
              );
            }

            cy.log(
              `✅ Verified expected toleration exists in pod "${podName}" in namespace "${podNamespace}".`,
            );
          },
        );
      });
    });
};
