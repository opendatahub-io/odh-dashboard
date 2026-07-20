import { createDataConnection } from './oc_commands/dataConnection';
import { createDSPASecret, createDSPA } from './oc_commands/dspa';
import { AWS_BUCKETS } from './s3Buckets';
import { createCleanProject } from './projectChecker';
import type {
  DataConnectionReplacements,
  DspaReplacements,
  DspaSecretReplacements,
} from '../types';

type AutoXDspaReplacements = DspaReplacements & {
  AWS_S3_HOST: string;
  AWS_S3_SCHEME: string;
};

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
 * Uses a custom DSPA template (autox_dspa.yaml) that:
 * - Derives host and scheme from the bucket ENDPOINT in test-variables.yml
 * - Sets podToPodTLS: true
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

  const dspaReplacements: AutoXDspaReplacements = {
    DSPA_SECRET_NAME: dspaSecretName,
    NAMESPACE: projectName,
    AWS_S3_BUCKET: bucketConfig.NAME,
    AWS_REGION: bucketConfig.REGION,
    AWS_S3_HOST: host,
    AWS_S3_SCHEME: scheme,
  };
  createDSPA(dspaReplacements, 'resources/yaml/autox_dspa.yaml');
};

/**
 * Wait for operator-provisioned managed pipelines to appear in KFP.
 *
 * After DSPA reports Ready=True the KFP pod asynchronously uploads pipelines
 * from its managed-pipelines config. The BFF caches discovery results for 5 min,
 * so if the first BFF request lands before pipelines exist, subsequent requests
 * (including run submission) will get a cached 404 for up to 5 minutes.
 *
 * This function polls the KFP API from inside the API server pod every 15s
 * (up to 5 min) to confirm pipelines exist before any BFF request is made.
 */
export const waitForManagedPipelines = (projectName: string): void => {
  const pipelineListCmd = `oc exec deploy/ds-pipeline-dspa -n ${projectName} -c ds-pipeline-api-server -- wget --no-check-certificate -qO- https://localhost:8888/apis/v2beta1/pipelines 2>/dev/null`;
  const maxAttempts = 20;
  const intervalMs = 15000;

  cy.log('Waiting for managed pipelines to be provisioned by the operator...');

  const poll = (attempt: number): void => {
    if (attempt >= maxAttempts) {
      throw new Error(
        `Managed pipelines not found after ${maxAttempts} attempts in ${projectName}`,
      );
    }

    cy.exec(pipelineListCmd, { failOnNonZeroExit: false, timeout: 30000 }).then((result) => {
      if (result.exitCode === 0) {
        try {
          const parsed = JSON.parse(result.stdout) as {
            pipelines?: unknown[];
            totalSize?: number;
          };
          if (parsed.pipelines && parsed.pipelines.length > 0) {
            cy.log(
              `Managed pipelines found (${parsed.pipelines.length}) on attempt ${attempt + 1}`,
            );
            return;
          }
        } catch {
          // JSON parse failed — pod may be restarting
        }
      }

      cy.log(`Attempt ${attempt + 1}/${maxAttempts}: pipelines not yet available, retrying...`);
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(intervalMs);
      poll(attempt + 1);
    });
  };

  poll(0);

  cy.log('Waiting for ds-pipeline rollout to stabilize...');
  cy.exec(`oc rollout status deploy/ds-pipeline-dspa -n ${projectName} --timeout=120s`, {
    failOnNonZeroExit: false,
    timeout: 130000,
  });
};
