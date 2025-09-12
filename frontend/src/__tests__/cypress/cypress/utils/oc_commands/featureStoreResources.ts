import { applyOpenShiftYaml } from '#~/__tests__/cypress/cypress/utils/oc_commands/baseCommands';
import { AWS_BUCKETS } from '#~/__tests__/cypress/cypress/utils/s3Buckets';

/**
 * Creates Feature Store custom resource by applying a YAML template.
 * This function dynamically replaces placeholders in the template with actual values and applies it.
 *
 * @param {string} namespace - The namespace of the feast custom resource flavor to be created.
 */
export const createFeatureStoreCR = (namespace: string): void => {
  cy.fixture('resources/yaml/feast.yaml').then((yamlTemplate) => {
    const {
      AWS_ACCESS_KEY_ID: awsAccessKey,
      AWS_SECRET_ACCESS_KEY: awsSecretKey,
      BUCKET_1: { NAME: awsBucketName, REGION: awsDefaultRegion },
    } = AWS_BUCKETS;

    const variables: Record<string, string> = {
      awsAccessKey,
      awsSecretKey,
      awsBucketName,
      awsDefaultRegion,
      namespace,
    };

    // Replace placeholders in YAML with actual values
    const yamlContent = Object.entries(variables).reduce(
      (content, [key, value]) => content.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value),
      yamlTemplate,
    );
    // Apply the modified YAML
    applyOpenShiftYaml(yamlContent);
  });
};
