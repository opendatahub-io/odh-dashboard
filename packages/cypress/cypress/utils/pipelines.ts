import { createDataConnection } from './oc_commands/dataConnection';
import { createDSPASecret, createDSPA } from './oc_commands/dspa';
import { AWS_BUCKETS, parseS3Endpoint } from './s3Buckets';
import { createCleanProject } from './projectChecker';
import type {
  DataConnectionReplacements,
  DspaSecretReplacements,
  DspaReplacements,
} from '../types';

export type PipelineDspaMlflowOptions = {
  integrationMode?: 'AUTODETECT' | 'DISABLED';
  injectUserEnvVars?: boolean;
  pipelineStore?: 'kubernetes' | 'database';
};

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
  mlflow?: PipelineDspaMlflowOptions,
): void => {
  const bucketConfig = AWS_BUCKETS[bucketKey];
  const dspaEndpoint = Cypress.env('DSPA_S3_ENDPOINT') as string | undefined;
  const { host, scheme } = parseS3Endpoint(dspaEndpoint ?? bucketConfig.ENDPOINT);

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
    AWS_REGION: bucketConfig.REGION,
    AWS_S3_HOST: host,
    AWS_S3_SCHEME: scheme,
    MLFLOW_INTEGRATION_MODE: mlflow?.integrationMode || 'DISABLED',
    MLFLOW_INJECT_USER_ENV_VARS: String(mlflow?.injectUserEnvVars || false),
    PIPELINE_STORE: mlflow?.pipelineStore || 'database',
  };
  createDSPA(dspaReplacements);
};
