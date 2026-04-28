import { pollUntilSuccess } from './baseCommands';
import { createCustomResource } from './customResources';
import type { CommandLineResult } from '../../types';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

const getApplicationsNamespace = (): string => {
  const namespace = Cypress.env('APPLICATIONS_NAMESPACE');
  if (!namespace) {
    throw new Error(
      'APPLICATIONS_NAMESPACE is not configured. Set CY_TEST_CONFIG to point to your test-variables.yml file.',
    );
  }
  return namespace;
};

const waitEvalHubReady = (namespace: string, crName: string): Cypress.Chainable<Cypress.Exec> =>
  pollUntilSuccess(
    `oc get evalhub ${crName} -n ${namespace} -o json | jq -e '.status.phase == "Ready"'`,
    `EvalHub ${crName} Ready in ${namespace}`,
    { maxAttempts: 72, pollIntervalMs: 5000 },
  );

/**
 * Ensures an EvalHub CR exists in `APPLICATIONS_NAMESPACE` and reaches phase Ready (BFF health).
 * If the CR is already present, only waits for Ready.
 *
 * @returns `true` if this run applied the manifest (teardown may delete); `false` if it already existed.
 */
export const ensureEvalHubCrReady = (
  crName: string,
  fixturePathRelativeToFixtures: string,
): Cypress.Chainable<boolean> => {
  const ns = getApplicationsNamespace();
  const existsCmd = `oc get evalhub ${crName} -n ${ns} -o name --ignore-not-found`;

  return cy.exec(existsCmd, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    const existed = result.stdout.trim().length > 0;

    if (existed) {
      cy.log(`EvalHub CR ${crName} already exists in ${ns}; waiting for Ready`);
      return waitEvalHubReady(ns, crName).then(() => cy.wrap(false));
    }

    cy.log(`Applying EvalHub CR ${crName} in ${ns} (operator will create service)`);
    return createCustomResource(ns, fixturePathRelativeToFixtures).then((applyResult) => {
      if (applyResult.code !== 0) {
        const maskedStderr = maskSensitiveInfo(applyResult.stderr || '');
        throw new Error(`oc apply EvalHub failed: ${maskedStderr}`);
      }
      return waitEvalHubReady(ns, crName).then(() => cy.wrap(true));
    });
  });
};

/** Deletes EvalHub CR by name in APPLICATIONS_NAMESPACE (used when this suite applied it). */
export const deleteEvalHubCr = (crName: string): Cypress.Chainable<CommandLineResult> => {
  const ns = getApplicationsNamespace();
  const cmd = `oc delete evalhub ${crName} -n ${ns} --ignore-not-found`;
  cy.log(`Deleting EvalHub CR: ${cmd}`);
  return cy.exec(cmd, { failOnNonZeroExit: false });
};
