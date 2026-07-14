/* eslint-disable cypress/no-unnecessary-waiting */
import { createCustomResource } from './customResources';
import type { CommandLineResult } from '../../types';

const applicationNamespace = Cypress.env('APPLICATIONS_NAMESPACE');
if (!applicationNamespace) {
  throw new Error(
    'APPLICATIONS_NAMESPACE environment variable is required. Set CYPRESS_APPLICATIONS_NAMESPACE or add it to test-variables.',
  );
}

/**
 * Searches for an LLMInferenceServiceConfig in the applications namespace whose name
 * contains the provided substring. If found, deletes it.
 *
 * @param configName - The `metadata.name` substring to search for.
 * @returns A Cypress.Chainable that resolves to the CommandLineResult.
 */
export const cleanupLLMInferenceServiceConfig = (
  configName: string,
): Cypress.Chainable<CommandLineResult> => {
  const sanitizedName = configName.replace(/[^a-zA-Z0-9_-]/g, '');
  const ocCommand = `oc get llminferenceserviceconfig -ojson -n ${applicationNamespace} | jq '.items[] | select(.metadata.name | contains("${sanitizedName}")) | .metadata.name' | tr -d '"'`;
  cy.log(`Executing delete LLMInferenceServiceConfig command: ${ocCommand}`);

  return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
    const name = result.stdout.trim();

    if (name) {
      cy.log(`LLMInferenceServiceConfig found: ${name}. Proceeding to delete.`);
      const deleteCommand = `oc delete llminferenceserviceconfig ${name} -n ${applicationNamespace}`;
      return cy.exec(deleteCommand, { failOnNonZeroExit: false });
    }
    cy.log('No matching LLMInferenceServiceConfig found, proceeding with the test.');
    return cy.wrap(result);
  });
};

/**
 * Creates a clean LLMInferenceServiceConfig by first removing any existing config
 * with the same name, then applying the provided YAML fixture.
 *
 * @param configName - The `metadata.name` of the config resource (used for cleanup).
 * @param configYamlPath - The fixture-relative path to the config YAML file.
 */
export const createCleanLLMInferenceServiceConfig = (
  configName: string,
  configYamlPath: string,
): void => {
  cy.log(`Cleaning up and creating LLMInferenceServiceConfig: ${configName}`);
  cleanupLLMInferenceServiceConfig(configName).then(() => {
    cy.log(`Creating LLMInferenceServiceConfig: ${configYamlPath}`);
    createCustomResource(applicationNamespace, configYamlPath);
  });
};

/**
 * Creates a topology configuration in the applications namespace by applying a YAML fixture.
 *
 * @param configName - Name of the config resource (for cleanup).
 * @param configYamlPath - Fixture-relative path to the topology config YAML.
 */
export const createTopologyConfig = (configName: string, configYamlPath: string): void => {
  createCleanLLMInferenceServiceConfig(configName, configYamlPath);
};

/**
 * Verifies that an LLMInferenceService has the expected baseRef names.
 * Retries up to `maxAttempts` times (5s apart) to handle propagation delay.
 *
 * @param serviceName - The `metadata.name` of the LLMInferenceService.
 * @param namespace - The namespace the service is deployed in.
 * @param expectedBaseRefs - Array of baseRef names that must appear in `spec.baseRefs`.
 */
export const checkLLMInferenceServiceBaseRefs = (
  serviceName: string,
  namespace: string,
  expectedBaseRefs: string[],
): Cypress.Chainable<CommandLineResult> => {
  const sanitizedName = serviceName.replace(/[^a-zA-Z0-9_-]/g, '');
  const sanitizedNamespace = namespace.replace(/[^a-zA-Z0-9_-]/g, '');
  const ocCommand = `oc get LLMInferenceService ${sanitizedName} -n ${sanitizedNamespace} -o json`;
  const maxAttempts = 12;
  let attempts = 0;

  const check = (): Cypress.Chainable<CommandLineResult> =>
    cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
      attempts++;

      if (result.exitCode !== 0) {
        if (attempts < maxAttempts) {
          cy.wait(5000);
          return check();
        }
        throw new Error(`Failed to get LLMInferenceService ${serviceName}: ${result.stderr}`);
      }

      let service;
      try {
        service = JSON.parse(result.stdout);
      } catch (e) {
        throw new Error(
          `Failed to parse LLMInferenceService JSON for ${serviceName}: ${result.stdout}`,
        );
      }

      const actualBaseRefs: string[] = (service.spec?.baseRefs ?? []).map(
        (ref: { name?: string }) => ref.name,
      );
      const allPresent = expectedBaseRefs.every((expected) => actualBaseRefs.includes(expected));

      if (!allPresent && attempts < maxAttempts) {
        cy.log(
          `Attempt ${attempts}: baseRefs not yet updated (found: [${actualBaseRefs.join(', ')}])`,
        );
        cy.wait(5000);
        return check();
      }

      for (const expected of expectedBaseRefs) {
        expect(actualBaseRefs).to.include(expected);
        cy.log(`baseRef verified: ${expected}`);
      }

      return cy.wrap(result);
    });

  cy.log(`Checking LLMInferenceService baseRefs: ${serviceName} (with retries)`);
  return check();
};

/**
 * Verifies that an LLMInferenceServiceConfig exists in the given namespace
 * and contains the expected metadata and spec fields.
 *
 * @param configName - The `metadata.name` of the config to check.
 * @param namespace - The namespace to look for the config in (e.g. the project namespace where it is copied on deploy).
 * @param expectedFields - Optional fields to verify in the resource JSON.
 */
export const checkLLMInferenceServiceConfigState = (
  configName: string,
  namespace: string,
  expectedFields?: { containerImage?: string },
): Cypress.Chainable<CommandLineResult> => {
  const sanitizedName = configName.replace(/[^a-zA-Z0-9_-]/g, '');
  const sanitizedNamespace = namespace.replace(/[^a-zA-Z0-9_-]/g, '');
  const ocCommand = `oc get LLMInferenceServiceConfig ${sanitizedName} -n ${sanitizedNamespace} -o json`;
  cy.log(`Checking LLMInferenceServiceConfig exists: ${configName} in namespace ${namespace}`);

  return cy.exec(ocCommand, { failOnNonZeroExit: true }).then((result) => {
    let config;
    try {
      config = JSON.parse(result.stdout);
    } catch (e) {
      throw new Error(
        `Failed to parse LLMInferenceServiceConfig JSON for ${configName}: ${result.stdout}`,
      );
    }

    expect(config.kind).to.equal('LLMInferenceServiceConfig');
    expect(config.metadata.name).to.equal(configName);
    cy.log(`✅ LLMInferenceServiceConfig ${configName} exists`);

    if (expectedFields?.containerImage) {
      const containers = config.spec?.template?.containers || [];
      const images = containers.map((c: { image?: string }) => c.image);
      expect(images).to.include(expectedFields.containerImage);
      cy.log(`✅ Container image verified: ${expectedFields.containerImage}`);
    }

    return cy.wrap(result);
  });
};
