import { createDataConnection } from '#~/__tests__/cypress/cypress/utils/oc_commands/dataConnection';
import { createDSPASecret, createDSPA } from '#~/__tests__/cypress/cypress/utils/oc_commands/dspa';
import { AWS_BUCKETS } from '#~/__tests__/cypress/cypress/utils/s3Buckets';
import type {
  DataConnectionReplacements,
  DspaSecretReplacements,
  DspaReplacements,
} from '#~/__tests__/cypress/cypress/types';
import { createCleanProject } from './projectChecker';

/**
 * Provision (using oc) a Project in order to make it usable with pipelines
 * (creates a Data Connection, a DSPA Secret and a DSPA)
 *
 * @param projectName Project Name
 * @param dspaSecretName DSPA Secret Name
 */
export const provisionProjectForPipelines = (
  projectName: string,
  dspaSecretName: string,
  bucketKey: 'BUCKET_2' | 'BUCKET_3',
  customDataConnectionYamlPath?: string,
): void => {
  cy.log(`Provisioning project with bucket key: ${bucketKey}`);

  const bucketConfig = AWS_BUCKETS[bucketKey];

  // Provision a Project
  createCleanProject(projectName);

  // Create a pipeline-compatible Data Connection
  const dataConnectionReplacements: DataConnectionReplacements = {
    NAMESPACE: projectName,
    AWS_ACCESS_KEY_ID: Buffer.from(AWS_BUCKETS.AWS_ACCESS_KEY_ID).toString('base64'),
    AWS_DEFAULT_REGION: Buffer.from(bucketConfig.REGION).toString('base64'),
    AWS_S3_BUCKET: Buffer.from(bucketConfig.NAME).toString('base64'),
    AWS_S3_ENDPOINT: Buffer.from(bucketConfig.ENDPOINT).toString('base64'),
    AWS_SECRET_ACCESS_KEY: Buffer.from(AWS_BUCKETS.AWS_SECRET_ACCESS_KEY).toString('base64'),
  };
  createDataConnection(dataConnectionReplacements, customDataConnectionYamlPath);

  // Configure Pipeline server: Create DSPA Secret
  const dspaSecretReplacements: DspaSecretReplacements = {
    DSPA_SECRET_NAME: dspaSecretName,
    NAMESPACE: projectName,
    AWS_ACCESS_KEY_ID: Buffer.from(AWS_BUCKETS.AWS_ACCESS_KEY_ID).toString('base64'),
    AWS_SECRET_ACCESS_KEY: Buffer.from(AWS_BUCKETS.AWS_SECRET_ACCESS_KEY).toString('base64'),
  };
  createDSPASecret(dspaSecretReplacements);

  // Configure Pipeline server: Create DSPA
  const dspaReplacements: DspaReplacements = {
    DSPA_SECRET_NAME: dspaSecretName,
    NAMESPACE: projectName,
    AWS_S3_BUCKET: bucketConfig.NAME,
  };
  createDSPA(dspaReplacements);
};
