/* eslint-disable cypress/no-unnecessary-waiting */

/**
 * Type for LlamaStackDistribution State
 */
type LlamaStackDistributionState = {
  status?: {
    phase?: string;
    conditions?: Array<{
      type: string;
      status: string;
      message?: string;
      reason?: string;
    }>;
  };
  metadata?: {
    name?: string;
  };
};

/**
 * Check LlamaStackDistribution status and wait for it to be Ready
 *
 * @param namespace The namespace where the LlamaStackDistribution is deployed
 * @returns Result Object of the operation
 */
export const checkLlamaStackDistributionReady = (
  namespace: string,
): Cypress.Chainable<Cypress.Exec> => {
  const ocCommand = `oc get llamastackdistributions -n ${namespace} -o json`;
  const maxAttempts = 96; // 8 minutes / 5 seconds = 96 attempts
  let attempts = 0;

  const checkState = (): Cypress.Chainable<Cypress.Exec> =>
    cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
      attempts++;

      // Log raw command output for debugging
      cy.log(`Raw command output (attempt ${attempts}):
        Exit code: ${result.code}
        Stdout length: ${result.stdout.length}
        Stderr: ${result.stderr || 'none'}`);

      // Check if the command failed
      if (result.code !== 0) {
        const errorMsg = `Command failed with exit code ${result.code}: ${result.stderr}`;
        cy.log(`❌ ${errorMsg}`);
        throw new Error(errorMsg);
      }

      // Check if stdout is empty
      if (!result.stdout.trim()) {
        const errorMsg = 'Command succeeded but returned empty output';
        cy.log(`❌ ${errorMsg}`);
        throw new Error(errorMsg);
      }

      let lsdList: { items: LlamaStackDistributionState[] };
      try {
        lsdList = JSON.parse(result.stdout) as { items: LlamaStackDistributionState[] };
      } catch (error) {
        const errorMsg = `Failed to parse LlamaStackDistribution JSON: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        cy.log(`❌ ${errorMsg}`);
        cy.log(`Raw stdout: ${result.stdout}`);
        throw new Error(errorMsg);
      }

      // Check if any LlamaStackDistribution exists
      if (lsdList.items.length === 0) {
        if (attempts >= maxAttempts) {
          const errorMsg = `No LlamaStackDistribution found in namespace ${namespace} after ${attempts} attempts`;
          cy.log(`❌ ${errorMsg}`);
          throw new Error(errorMsg);
        }
        cy.log(`⏳ No LlamaStackDistribution found yet, retrying...`);
        return cy.wait(5000).then(() => checkState());
      }

      // Get the first LlamaStackDistribution (assuming one per namespace)
      const lsd = lsdList.items[0];
      const phase = lsd.status?.phase || 'EMPTY';
      const name = lsd.metadata?.name || 'unknown';

      cy.log(`🧐 Attempt ${attempts}: Checking LlamaStackDistribution state
        Name: ${name}
        Phase: ${phase}
        Namespace: ${namespace}`);

      // Check if the LlamaStackDistribution is Ready
      if (phase === 'Ready') {
        cy.log(
          `✅ LlamaStackDistribution ${name} is Ready in namespace ${namespace} after ${attempts} attempts`,
        );
        return cy.wrap(result);
      }

      // Check if the LlamaStackDistribution has failed
      if (phase === 'Failed') {
        // Log the full status for debugging
        cy.log('LlamaStackDistribution Status:', JSON.stringify(lsd.status, null, 2));

        // Extract error details if available
        const conditions = lsd.status?.conditions || [];
        const errorDetails = conditions
          .map(
            (c: { type: string; status: string; message?: string; reason?: string }) =>
              `${c.type}: ${c.status}${c.message ? ` - ${c.message}` : ''}${
                c.reason ? ` (${c.reason})` : ''
              }`,
          )
          .join('\n');

        const errorMsg = `❌ LlamaStackDistribution ${name} failed in namespace ${namespace}
          Phase: Failed
          ${errorDetails ? `Conditions:\n${errorDetails}` : 'No condition details available'}`;

        cy.log(errorMsg);
        throw new Error(errorMsg);
      }

      if (attempts >= maxAttempts) {
        const errorMessage = `❌ LlamaStackDistribution ${name} did not become Ready within 8 minutes
          Current Phase: ${phase}
          Namespace: ${namespace}`;

        cy.log(errorMessage);
        throw new Error(errorMessage);
      }

      cy.log(`⏳ Phase is "${phase}", waiting 5 seconds before next check...`);
      return cy.wait(5000).then(() => checkState());
    });

  return checkState();
};
