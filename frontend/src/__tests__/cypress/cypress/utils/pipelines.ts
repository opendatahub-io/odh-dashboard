// Import necessary functions and types
import { createOpenShiftProject } from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import { createDataConnection } from '~/__tests__/cypress/cypress/utils/oc_commands/dataConnection';
import { createDSPASecret, createDSPA } from '~/__tests__/cypress/cypress/utils/oc_commands/dspa';
import { AWS_BUCKETS } from '~/__tests__/cypress/cypress/utils/s3Buckets';
import type {
  DataConnectionReplacements,
  DspaSecretReplacements,
  DspaReplacements,
} from '~/__tests__/cypress/cypress/types';

/**
 * Provision (using oc) a Project in order to make it usable with pipelines
 * (creates a Data Connection, a DSPA Secret and a DSPA)
 *
 * @param projectName Project Name
 * @param dspaSecretName DSPA Secret Name
 */
export const provisionProjectForPipelines = (projectName: string, dspaSecretName: string): void => {
  // Provision a Project
  createOpenShiftProject(projectName);

  // Create a pipeline compatible Data Connection
  const dataConnectionReplacements: DataConnectionReplacements = {
    NAMESPACE: projectName,
    AWS_ACCESS_KEY_ID: Buffer.from(AWS_BUCKETS.AWS_ACCESS_KEY_ID).toString('base64'),
    AWS_DEFAULT_REGION: Buffer.from(AWS_BUCKETS.BUCKET_2.REGION).toString('base64'),
    AWS_S3_BUCKET: Buffer.from(AWS_BUCKETS.BUCKET_2.NAME).toString('base64'),
    AWS_S3_ENDPOINT: Buffer.from(AWS_BUCKETS.BUCKET_2.ENDPOINT).toString('base64'),
    AWS_SECRET_ACCESS_KEY: Buffer.from(AWS_BUCKETS.AWS_SECRET_ACCESS_KEY).toString('base64'),
  };
  createDataConnection(dataConnectionReplacements);

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
    AWS_S3_BUCKET: AWS_BUCKETS.BUCKET_2.NAME,
  };
  createDSPA(dspaReplacements);
};
