import { applyOpenShiftYaml, type PollOptions } from './baseCommands';
import {
  addKueueLabelToNamespace,
  createKueueWorkbenchResources,
  type KueueWorkbenchConfig,
} from './kueueWorkbench';
import type { CommandLineResult } from '../../types';

const applicationNamespace = Cypress.env('APPLICATIONS_NAMESPACE');

const pollOcStdout = (
  command: string,
  isDone: (stdout: string) => boolean,
  waitingMessage: string,
  failureMessage: (stdout: string, stderr: string, elapsed: string) => string,
  { maxAttempts = 60, pollIntervalMs = 5000 }: PollOptions = {},
): Cypress.Chainable<string> => {
  const startTime = Date.now();

  const check = (attemptNumber = 1): Cypress.Chainable<string> =>
    cy.exec(command, { failOnNonZeroExit: false }).then((result) => {
      const stdout = result.stdout.trim();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      if (isDone(stdout)) {
        return cy.wrap(stdout);
      }

      if (attemptNumber >= maxAttempts) {
        throw new Error(failureMessage(stdout, result.stderr.trim(), elapsed));
      }

      cy.log(`${waitingMessage} (attempt ${attemptNumber}/${maxAttempts}, elapsed: ${elapsed}s)`);
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      return cy.wait(pollIntervalMs).then(() => check(attemptNumber + 1));
    });

  return check();
};

const createKueueModelServingHardwareProfile = (
  config: KueueWorkbenchConfig,
): Cypress.Chainable<CommandLineResult> =>
  cy.fixture('resources/hardwareProfile/kueue_model_serving_profile.yaml').then((yamlTemplate) => {
    const variables = {
      hardwareProfileName: config.hardwareProfileName,
      hardwareProfileNamespace: applicationNamespace,
      displayName: config.hardwareProfileDisplayName,
      localQueueName: config.localQueueName,
    };

    let yamlContent = yamlTemplate;
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      yamlContent = yamlContent.replace(regex, String(variables[key as keyof typeof variables]));
    });

    return applyOpenShiftYaml(yamlContent, applicationNamespace);
  });

export const setupKueueModelDeploymentResources = (
  config: KueueWorkbenchConfig,
  namespace: string,
): Cypress.Chainable<CommandLineResult> =>
  addKueueLabelToNamespace(namespace)
    .then(() =>
      cy.exec(`oc label namespace ${namespace} modelmesh-enabled=false --overwrite`, {
        failOnNonZeroExit: false,
      }),
    )
    .then(() => createKueueWorkbenchResources(config, namespace))
    .then(() => createKueueModelServingHardwareProfile(config));

export const pollUntilWorkloadAdmitted = (
  namespace: string,
  options?: PollOptions,
): Cypress.Chainable<string> =>
  pollOcStdout(
    `oc get workloads.kueue.x-k8s.io -n ${namespace} -o jsonpath='{range .items[*]}{.status.conditions[?(@.type=="Admitted")].status}{"\\n"}{end}'`,
    (stdout) => stdout.includes('True'),
    `Waiting for Kueue Workload admission in ${namespace}`,
    (stdout, stderr, elapsed) =>
      `Kueue Workload not admitted in ${namespace} (${elapsed}s). stdout: "${stdout}", stderr: "${stderr}"`,
    options,
  );

export const pollUntilAnyWorkloadMessageMatches = (
  namespace: string,
  messagePattern: RegExp,
  options?: PollOptions,
): Cypress.Chainable<string> =>
  pollOcStdout(
    `oc get workloads -n ${namespace} -o jsonpath='{range .items[*]}{.status.conditions[?(@.type=="QuotaReserved")].message}{"\\n"}{end}'`,
    (stdout) => !!stdout && messagePattern.test(stdout),
    `Waiting for Kueue Workload message in ${namespace}`,
    (stdout, stderr, elapsed) =>
      `Kueue Workload message did not match ${messagePattern} in ${namespace} (${elapsed}s). messages: "${stdout}", stderr: "${stderr}"`,
    options,
  );
