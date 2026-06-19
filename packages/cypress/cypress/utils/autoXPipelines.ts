import { createDataConnection } from './oc_commands/dataConnection';
import { createDSPASecret, createDSPA } from './oc_commands/dspa';
import { AWS_BUCKETS } from './s3Buckets';
import { createCleanProject } from './projectChecker';
import type { DataConnectionReplacements, DspaSecretReplacements } from '../types';

/**
 * Parse an S3 endpoint URL into host and scheme components.
 * e.g. "https://s3.us-west.cloud-object-storage.appdomain.cloud/" → { host: "s3.us-west...", scheme: "https" }
 */
const parseS3Endpoint = (endpoint: string): { host: string; scheme: string } => {
  try {
    const url = new URL(endpoint);
    return { host: url.host, scheme: url.protocol.replace(':', '') };
  } catch {
    return { host: endpoint.replace(/\/+$/, ''), scheme: 'https' };
  }
};

/**
 * Provision a Project for AutoML/AutoRAG pipelines.
 *
 * Uses a custom DSPA template (automl_dspa.yaml) that:
 * - Derives host and scheme from the bucket ENDPOINT in test-variables.yml
 * - Sets podToPodTLS: false
 *
 * @param projectName Project Name
 * @param dspaSecretName DSPA Secret Name
 * @param bucketKey Which S3 bucket config to use
 */
export const provisionProjectForAutoX = (
  projectName: string,
  dspaSecretName: string,
  bucketKey: 'BUCKET_2' | 'BUCKET_3',
): void => {
  const bucketConfig = AWS_BUCKETS[bucketKey];
  // Use DSPA_S3_ENDPOINT env var for in-cluster DSPA connectivity (disconnected clusters),
  // falling back to the external ENDPOINT (connected clusters / CI).
  // Must use full FQDN: CYPRESS_DSPA_S3_ENDPOINT=http://minio.ns.svc.cluster.local:9000
  const dspaEndpoint = Cypress.env('DSPA_S3_ENDPOINT') as string | undefined;
  const { host, scheme } = parseS3Endpoint(dspaEndpoint ?? bucketConfig.ENDPOINT);

  createCleanProject(projectName);

  const dataConnectionReplacements: DataConnectionReplacements = {
    NAMESPACE: projectName,
    AWS_ACCESS_KEY_ID: Buffer.from(AWS_BUCKETS.AWS_ACCESS_KEY_ID).toString('base64'),
    AWS_DEFAULT_REGION: Buffer.from(bucketConfig.REGION).toString('base64'),
    AWS_S3_BUCKET: Buffer.from(bucketConfig.NAME).toString('base64'),
    AWS_S3_ENDPOINT: Buffer.from(bucketConfig.ENDPOINT).toString('base64'),
    AWS_SECRET_ACCESS_KEY: Buffer.from(AWS_BUCKETS.AWS_SECRET_ACCESS_KEY).toString('base64'),
  };
  createDataConnection(dataConnectionReplacements);

  const dspaSecretReplacements: DspaSecretReplacements = {
    DSPA_SECRET_NAME: dspaSecretName,
    NAMESPACE: projectName,
    AWS_ACCESS_KEY_ID: Buffer.from(AWS_BUCKETS.AWS_ACCESS_KEY_ID).toString('base64'),
    AWS_SECRET_ACCESS_KEY: Buffer.from(AWS_BUCKETS.AWS_SECRET_ACCESS_KEY).toString('base64'),
  };
  createDSPASecret(dspaSecretReplacements);

  const dspaReplacements = {
    DSPA_SECRET_NAME: dspaSecretName,
    NAMESPACE: projectName,
    AWS_S3_BUCKET: bucketConfig.NAME,
    AWS_REGION: bucketConfig.REGION,
    AWS_S3_HOST: host,
    AWS_S3_SCHEME: scheme,
  };
  createDSPA(dspaReplacements, 'resources/yaml/automl_dspa.yaml');
};
