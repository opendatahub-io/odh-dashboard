import { applyOpenShiftYaml } from './baseCommands';
import { maskSensitiveInfo } from '../maskSensitiveInfo';
import type { CommandLineResult } from '../../types';

export type InfrastructureWorkloadsConfig = {
  managedProjectName: string;
  trainJobName: string;
  trainingRuntimeName: string;
  hardwareProfileName: string;
  resourceFlavorName: string;
  clusterQueueName: string;
  localQueueName: string;
  initialCpuQuota: number;
  memoryQuota: number;
};

const applicationNamespace = Cypress.env('APPLICATIONS_NAMESPACE');

const replaceTemplateVariables = (
  yamlTemplate: string,
  variables: Record<string, string | number>,
): string => {
  let yamlContent = yamlTemplate;
  Object.entries(variables).forEach(([key, value]) => {
    yamlContent = yamlContent.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), String(value));
  });
  return yamlContent;
};

export const setupInfrastructureWorkloadsResources = (
  config: InfrastructureWorkloadsConfig,
): Cypress.Chainable<CommandLineResult> =>
  cy
    .exec(
      `oc label namespace ${config.managedProjectName} kueue.openshift.io/managed=true --overwrite`,
      { failOnNonZeroExit: false },
    )
    .then((result) => {
      if (result.exitCode !== 0) {
        throw new Error(`Failed to label managed project: ${maskSensitiveInfo(result.stderr)}`);
      }
      return cy.fixture('resources/yaml/kueue-resources-training.yaml');
    })
    .then((yamlTemplate: string) =>
      applyOpenShiftYaml(
        replaceTemplateVariables(yamlTemplate, {
          flavorName: config.resourceFlavorName,
          clusterQueueName: config.clusterQueueName,
          localQueueName: config.localQueueName,
          namespace: config.managedProjectName,
          cpuQuota: config.initialCpuQuota,
          memoryQuota: config.memoryQuota,
          gpuQuota: 0,
        }),
      ),
    )
    .then(() => cy.fixture('resources/yaml/training-runtime.yaml'))
    .then((yamlTemplate: string) =>
      applyOpenShiftYaml(
        replaceTemplateVariables(yamlTemplate, {
          namespace: config.managedProjectName,
          trainingRuntimeName: config.trainingRuntimeName,
        }),
      ),
    )
    .then(() => cy.fixture('resources/yaml/train-job.yaml'))
    .then((yamlTemplate: string) =>
      applyOpenShiftYaml(
        replaceTemplateVariables(yamlTemplate, {
          namespace: config.managedProjectName,
          trainJobName: config.trainJobName,
          trainingRuntimeName: config.trainingRuntimeName,
          localQueueName: config.localQueueName,
        }),
      ),
    );

export const setupInfrastructureWorkloadsHardwareProfile = (
  hardwareProfileName: string,
): Cypress.Chainable<CommandLineResult> =>
  cy
    .fixture('resources/hardwareProfile/infrastructure_workloads_profile.yaml')
    .then((yamlTemplate: string) =>
      applyOpenShiftYaml(
        replaceTemplateVariables(yamlTemplate, { hardwareProfileName }),
        applicationNamespace,
      ),
    );

export const cleanupInfrastructureWorkloadsResources = (
  config: InfrastructureWorkloadsConfig,
): Cypress.Chainable<CommandLineResult> => {
  const commands = [
    `oc delete localqueue ${config.localQueueName} -n ${config.managedProjectName} --wait=false --ignore-not-found`,
    `oc delete clusterqueue ${config.clusterQueueName} --wait=false --ignore-not-found`,
    `oc delete resourceflavor ${config.resourceFlavorName} --wait=false --ignore-not-found`,
    `oc delete hardwareprofile ${config.hardwareProfileName} -n ${applicationNamespace} --wait=false --ignore-not-found`,
  ];
  const command = [
    'cleanup_failed=0',
    ...commands.map((value) => `${value} || cleanup_failed=1`),
    'exit $cleanup_failed',
  ].join('\n');

  return cy.exec(command, { failOnNonZeroExit: false, timeout: 120000 }).then((result) => {
    if (result.exitCode !== 0) {
      cy.log(
        `Some Infrastructure Workloads resources failed cleanup: ${maskSensitiveInfo(
          result.stderr,
        )}`,
      );
    }
    return cy.wrap(result);
  });
};
