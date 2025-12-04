import { execWithOutput } from './baseCommands';
import { getModelRegistryNamespace } from './modelRegistry';
import type { CommandLineResult } from '../../types';

/**
 * Verify that the model-catalog-sources ConfigMap exists in the model registry namespace.
 * @returns A Cypress chainable that resolves with the command result.
 */
export const verifyModelCatalogSourcesConfigMap = (): Cypress.Chainable<CommandLineResult> => {
  const namespace = getModelRegistryNamespace();
  const command = `oc get configmap model-catalog-sources -n ${namespace}`;
  cy.log(`Verifying model-catalog-sources ConfigMap: ${command}`);

  return execWithOutput(command, 30).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      cy.log(`ERROR: model-catalog-sources ConfigMap not found in ${namespace}`);
      cy.log(`stdout: ${result.stdout}`);
      cy.log(`stderr: ${result.stderr}`);
      throw new Error(
        `model-catalog-sources ConfigMap not found in ${namespace}: ${result.stderr}`,
      );
    }
    cy.log(`✓ model-catalog-sources ConfigMap exists in ${namespace}`);
    return cy.wrap(result);
  });
};

/**
 * Verify that the model-catalog deployment exists and is available in the model registry namespace.
 * @returns A Cypress chainable that resolves with the command result.
 */
export const verifyModelCatalogDeployment = (): Cypress.Chainable<CommandLineResult> => {
  const namespace = getModelRegistryNamespace();
  const command = `oc get deployment model-catalog -n ${namespace}`;
  cy.log(`Verifying model-catalog deployment: ${command}`);

  return execWithOutput(command, 30).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      cy.log(`ERROR: model-catalog deployment not found in ${namespace}`);
      cy.log(`stdout: ${result.stdout}`);
      cy.log(`stderr: ${result.stderr}`);
      throw new Error(`model-catalog deployment not found in ${namespace}: ${result.stderr}`);
    }
    cy.log(`✓ model-catalog deployment exists in ${namespace}`);
    return cy.wrap(result);
  });
};

/**
 * Verify that the model-catalog service exists in the model registry namespace.
 * @returns A Cypress chainable that resolves with the command result.
 */
export const verifyModelCatalogService = (): Cypress.Chainable<CommandLineResult> => {
  const namespace = getModelRegistryNamespace();
  const command = `oc get service model-catalog -n ${namespace}`;
  cy.log(`Verifying model-catalog service: ${command}`);

  return execWithOutput(command, 30).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      cy.log(`ERROR: model-catalog service not found in ${namespace}`);
      cy.log(`stdout: ${result.stdout}`);
      cy.log(`stderr: ${result.stderr}`);
      throw new Error(`model-catalog service not found in ${namespace}: ${result.stderr}`);
    }
    cy.log(`✓ model-catalog service exists in ${namespace}`);
    return cy.wrap(result);
  });
};

/**
 * Comprehensive verification of Model Catalog backend resources.
 * This checks deployment, ConfigMap, and service in the model registry namespace.
 * @returns A Cypress chainable that performs all verifications.
 */
export const verifyModelCatalogBackend = (): Cypress.Chainable<CommandLineResult> => {
  const modelRegistryNamespace = getModelRegistryNamespace();

  cy.step(`Verifying Model Catalog backend resources`);
  cy.log(`Model Registry namespace: ${modelRegistryNamespace}`);

  // Check deployment (most critical - the actual backend server)
  verifyModelCatalogDeployment();

  // Check required ConfigMap (contains model definitions)
  verifyModelCatalogSourcesConfigMap();

  // Check service (routes traffic to deployment)
  return verifyModelCatalogService();
};
