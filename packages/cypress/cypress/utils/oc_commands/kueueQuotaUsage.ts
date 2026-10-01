import { applyOpenShiftYaml } from './baseCommands';
import { maskSensitiveInfo } from '../maskSensitiveInfo';
import type { CommandLineResult } from '../../types';

export type KueueQuotaUsageNavigationConfig = {
  managedProjectName: string;
  resourceFlavorName: string;
  parentCohortName: string;
  cohortName: string;
  emptyCohortName: string;
  cohortClusterQueueName: string;
  standaloneClusterQueueName: string;
  localQueueName: string;
  acceleratorResourceName: string;
  acceleratorQuota: number;
};

const replaceTemplateVariables = (
  yamlTemplate: string,
  config: KueueQuotaUsageNavigationConfig,
): string => {
  let yamlContent = yamlTemplate;
  Object.entries(config).forEach(([key, value]) => {
    const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
    yamlContent = yamlContent.replace(regex, String(value));
  });
  return yamlContent;
};

/** Adds the label required for the dashboard to recognize a Kueue-managed project. */
const labelKueueManagedProject = (projectName: string): Cypress.Chainable<CommandLineResult> =>
  cy
    .exec(`oc label namespace ${projectName} kueue.openshift.io/managed=true --overwrite`, {
      failOnNonZeroExit: false,
    })
    .then((result) => {
      if (result.exitCode !== 0) {
        throw new Error(
          `Failed to enable Kueue for test project: ${maskSensitiveInfo(result.stderr)}`,
        );
      }
      return cy.wrap(result);
    });

/** Creates the ResourceFlavor, Cohort, ClusterQueues, and LocalQueue used by the test. */
export const setupKueueQuotaUsageNavigationResources = (
  config: KueueQuotaUsageNavigationConfig,
): Cypress.Chainable<CommandLineResult> =>
  labelKueueManagedProject(config.managedProjectName).then(() =>
    cy
      .fixture('resources/yaml/kueue-quota-usage-navigation.yaml')
      .then((yamlTemplate: string) =>
        applyOpenShiftYaml(replaceTemplateVariables(yamlTemplate, config)),
      ),
  );

/** Deletes only the cluster-scoped and namespaced resources created for this test. */
export const cleanupKueueQuotaUsageNavigationResources = (
  config: KueueQuotaUsageNavigationConfig,
): Cypress.Chainable<CommandLineResult> => {
  const commands = [
    `oc delete LocalQueue ${config.localQueueName} -n ${config.managedProjectName} --wait=false --ignore-not-found`,
    `oc delete ClusterQueue ${config.cohortClusterQueueName} --wait=false --ignore-not-found`,
    `oc delete ClusterQueue ${config.standaloneClusterQueueName} --wait=false --ignore-not-found`,
    `oc delete Cohort ${config.cohortName} --wait=false --ignore-not-found`,
    `oc delete Cohort ${config.emptyCohortName} --wait=false --ignore-not-found`,
    `oc delete Cohort ${config.parentCohortName} --wait=false --ignore-not-found`,
    `oc delete ResourceFlavor ${config.resourceFlavorName} --wait=false --ignore-not-found`,
  ];
  const command = [
    'cleanup_failed=0',
    ...commands.map((value) => `${value} || cleanup_failed=1`),
    'exit $cleanup_failed',
  ].join('\n');

  return cy.exec(command, { failOnNonZeroExit: false, timeout: 120000 }).then((result) => {
    if (result.exitCode !== 0) {
      cy.log(
        `Some Kueue quota usage resources failed cleanup: ${maskSensitiveInfo(result.stderr)}`,
      );
    }
    return cy.wrap(result);
  });
};
