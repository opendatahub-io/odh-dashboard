import * as yaml from 'js-yaml';
import { getSingleModelPath } from '#~/__tests__/cypress/cypress/utils/fileImportUtils';

// Define interfaces for the parsed YAML structure
interface Metadata {
  name: string; // Expecting a string for name
  annotations?: {
    [key: string]: string; // Allow any string key for annotations
  };
}

interface SingleModelParsedYaml {
  metadata: Metadata;
}

// Function to get single-model serving runtime info
export function getSingleModelServingRuntimeInfo(): Cypress.Chainable<{
  singleModelServingName: string;
  displayName: string;
}> {
  const filePath = getSingleModelPath();

  return cy.readFile(filePath).then((content) => {
    const parsedYaml = yaml.load(content) as SingleModelParsedYaml;
    const singleModelServingName = parsedYaml.metadata.name || '';
    const displayName = parsedYaml.metadata.annotations?.['openshift.io/display-name'] || '';

    // Check if values are strings
    if (typeof singleModelServingName !== 'string' || typeof displayName !== 'string') {
      throw new Error(
        `Expected singleModelServingName to be a string, but got: ${typeof singleModelServingName}`,
      );
    }

    return {
      singleModelServingName,
      displayName,
    };
  });
}
