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

const STUB_PIPELINE_YAML = [
  'components:',
  '  comp-noop:',
  '    executorLabel: exec-noop',
  'deploymentSpec:',
  '  executors:',
  '    exec-noop:',
  '      container:',
  '        command:',
  '          - echo',
  '          - done',
  '        image: registry.access.redhat.com/ubi9/ubi-minimal:latest',
  'root:',
  '  dag:',
  '    tasks:',
  '      noop:',
  '        componentRef:',
  '          name: comp-noop',
  '        taskInfo:',
  '          name: noop',
  'schemaVersion: 2.1.0',
  'sdkVersion: kfp-2.7.0',
].join('\\n');

const MANAGED_AUTOML_PIPELINES = [
  'autogluon-tabular-training-pipeline',
  'autogluon-timeseries-training-pipeline',
];

/**
 * Upload stub managed AutoML pipelines to the pipeline server via the KFP API.
 *
 * The BFF discovers pipelines by display name and returns a "no managed
 * pipelines" error if they are missing. This seeds the pipeline server with
 * minimal stub definitions so the experiments page loads and runs can be
 * created. Scoped to the DSPA in the given namespace — does not affect
 * other namespaces or tests.
 *
 * Uses the DSP API server route + OAuth token to call the KFP upload API.
 * Idempotent — silently ignores errors if pipelines already exist.
 */
export const uploadManagedAutoMLPipelines = (namespace: string): void => {
  cy.exec(`oc get route ds-pipeline-dspa -n ${namespace} -o jsonpath='{.spec.host}'`, {
    failOnNonZeroExit: false,
  }).then((routeResult) => {
    const routeHost = routeResult.stdout.replace(/'/g, '').trim();
    if (routeResult.exitCode !== 0 || !routeHost) {
      cy.log('[AutoML Pipelines] No DSP route found — skipping managed pipeline upload');
      return;
    }

    cy.exec('oc whoami -t', { failOnNonZeroExit: false, log: false }).then((tokenResult) => {
      const token = tokenResult.stdout.trim();
      if (tokenResult.exitCode !== 0 || !token) {
        cy.log('[AutoML Pipelines] Could not get auth token — skipping managed pipeline upload');
        return;
      }

      const baseUrl = `https://${routeHost}/apis/v2beta1`;

      // Wait for the KFP API to be healthy before uploading — the DSPA
      // condition reports Ready before the API server is fully initialized.
      const healthCmd = [
        `for i in $(seq 1 60); do`,
        `  STATUS=$(curl -ks -o /dev/null -w '%{http_code}'`,
        `    "${baseUrl}/healthz"`,
        `    -H "Authorization: Bearer ${token}");`,
        `  [ "$STATUS" = "200" ] && exit 0;`,
        `  sleep 2;`,
        `done;`,
        `exit 1`,
      ].join(' ');

      cy.exec(healthCmd, {
        failOnNonZeroExit: false,
        timeout: 130000,
        log: false,
      }).then((healthResult) => {
        if (healthResult.exitCode !== 0) {
          cy.log('[AutoML Pipelines] KFP API not healthy after 120s — skipping pipeline upload');
          return;
        }
        cy.log('[AutoML Pipelines] KFP API is healthy');

        for (const pipelineName of MANAGED_AUTOML_PIPELINES) {
          const uploadCmd = [
            `printf '${STUB_PIPELINE_YAML}' |`,
            `curl -ks -o /dev/null -w '%{http_code}'`,
            `-X POST "${baseUrl}/pipelines/upload?name=${pipelineName}"`,
            `-H "Authorization: Bearer ${token}"`,
            `-F "uploadfile=@-;filename=pipeline.yaml"`,
          ].join(' ');

          cy.exec(uploadCmd, { failOnNonZeroExit: false, log: false }).then((uploadResult) => {
            const status = uploadResult.stdout.trim();
            cy.log(`[AutoML Pipelines] Upload ${pipelineName}: HTTP ${status}`);
          });
        }
      });
    });
  });
};
