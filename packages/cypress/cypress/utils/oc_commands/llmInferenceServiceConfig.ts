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
