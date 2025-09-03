import { applyOpenShiftYaml } from '#~/__tests__/cypress/cypress/utils/oc_commands/baseCommands';

/**
 * Creates Feature Store custom resource by applying a YAML template.
 * This function dynamically replaces placeholders in the template with actual values and applies it.
 *
 * @param {string} namespace - The namespace of the resource flavor.
 * @param {string} awsAccessKey - AWS Access Key.
 * @param {string} awsSecretKey - AWS Secret Key.
 * @param {string} awsBucketName - AWS Bucket Name.
 * @param {string} awsDefaultRegion - AWS Default Region.
 */
export const createFeatureStoreCR = (
  awsAccessKey: string,
  awsSecretKey: string,
  awsBucketName: string,
  awsDefaultRegion: string,
  namespace: string,
): void => {
  cy.fixture('resources/yaml/feast.yaml').then((yamlTemplate) => {
    const variables = {
      awsAccessKey,
      awsSecretKey,
      awsBucketName,
      awsDefaultRegion,
      namespace,
    };

    // Replace placeholders in YAML with actual values
    let yamlContent = yamlTemplate;
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
      yamlContent = yamlContent.replace(regex, String(variables[key as keyof typeof variables]));
    });

    // Apply the modified YAML
    applyOpenShiftYaml(yamlContent);
  });
};
