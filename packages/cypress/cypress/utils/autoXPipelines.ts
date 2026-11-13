import { assertAutoXDataConnectionEndpoint, resolveAutoXS3Endpoint } from './autoXS3';
import { createDataConnection } from './oc_commands/dataConnection';
import { createDSPASecret, createDSPA } from './oc_commands/dspa';
import { AWS_BUCKETS, parseS3Endpoint } from './s3Buckets';
import { createCleanProject } from './projectChecker';
import type {
  CommandLineResult,
  DataConnectionReplacements,
  DspaReplacements,
  DspaSecretReplacements,
} from '../types';

type AutoXDspaReplacements = DspaReplacements & {
  AWS_S3_HOST: string;
  AWS_S3_SCHEME: string;
};

/**
 * Provision a Project for AutoML/AutoRAG pipelines.
 *
 * Uses a custom DSPA template (autox_dspa.yaml) that:
 * - Derives host and scheme from the resolved AutoX S3 endpoint
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
  // Use DSPA_S3_ENDPOINT for in-cluster AutoX connectivity (disconnected clusters),
  // falling back to the external ENDPOINT (connected clusters / CI).
  // Must use full FQDN: CYPRESS_DSPA_S3_ENDPOINT=http://minio.ns.svc.cluster.local:9000
  const s3Endpoint = resolveAutoXS3Endpoint(bucketConfig.ENDPOINT);
  const { host, scheme } = parseS3Endpoint(s3Endpoint);

  createCleanProject(projectName);

  const dataConnectionReplacements: DataConnectionReplacements = {
    NAMESPACE: projectName,
    AWS_ACCESS_KEY_ID: Buffer.from(AWS_BUCKETS.AWS_ACCESS_KEY_ID).toString('base64'),
    AWS_DEFAULT_REGION: Buffer.from(bucketConfig.REGION).toString('base64'),
    AWS_S3_BUCKET: Buffer.from(bucketConfig.NAME).toString('base64'),
    AWS_S3_ENDPOINT: Buffer.from(s3Endpoint).toString('base64'),
    AWS_SECRET_ACCESS_KEY: Buffer.from(AWS_BUCKETS.AWS_SECRET_ACCESS_KEY).toString('base64'),
  };
  createDataConnection(dataConnectionReplacements).then(() =>
    assertAutoXDataConnectionEndpoint(projectName, s3Endpoint),
  );

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
    MLFLOW_INTEGRATION_MODE: 'DISABLED',
    MLFLOW_INJECT_USER_ENV_VARS: 'false',
    PIPELINE_STORE: 'database',
  };
  createDSPA(dspaReplacements, 'resources/yaml/autox_dspa.yaml');
};

export const AUTORAG_MANAGED_PIPELINE_NAMES = [
  'documents-rag-optimization-pipeline',
  'documents-indexing-pipeline',
] as const;

type PipelineSummary = {
  pipeline_id?: string;
  display_name?: string;
};

type PipelineListResponse = {
  pipelines?: PipelineSummary[];
};

type PipelineVersionSummary = {
  pipeline_version_id?: string;
};

type PipelineVersionListResponse = {
  pipeline_versions?: PipelineVersionSummary[];
};

const MANAGED_PIPELINE_CURL_CONNECT_TIMEOUT_SECONDS = 5;
const MANAGED_PIPELINE_CURL_MAX_TIME_SECONDS = 25;

const shellQuote = (value: string): string => `'${value.replace(/'/g, `'"'"'`)}'`;

const listManagedPipelines = (projectName: string): Cypress.Chainable<PipelineSummary[]> => {
  const pipelineListCmd =
    `oc exec deploy/ds-pipeline-dspa -n ${shellQuote(projectName)} -c ds-pipeline-api-server -- ` +
    `curl --connect-timeout ${MANAGED_PIPELINE_CURL_CONNECT_TIMEOUT_SECONDS} ` +
    `--max-time ${MANAGED_PIPELINE_CURL_MAX_TIME_SECONDS} -ksSf ` +
    `'https://localhost:8888/apis/v2beta1/pipelines?page_size=100' 2>/dev/null`;
  return cy
    .exec(pipelineListCmd, { failOnNonZeroExit: false, timeout: 30000, log: false })
    .then((result: CommandLineResult): PipelineSummary[] => {
      if (result.exitCode !== 0) {
        return [];
      }

      try {
        return (JSON.parse(result.stdout) as PipelineListResponse).pipelines ?? [];
      } catch {
        return [];
      }
    });
};

const hasUsablePipelineVersions = (
  projectName: string,
  pipelines: PipelineSummary[],
): Cypress.Chainable<boolean> => {
  const checkPipeline = (index: number): Cypress.Chainable<boolean> => {
    if (index >= pipelines.length) {
      return cy.wrap(true);
    }

    const pipelineId = pipelines[index].pipeline_id;
    if (!pipelineId) {
      return cy.wrap(false);
    }

    if (!/^[A-Za-z0-9._-]+$/.test(pipelineId)) {
      return cy.wrap(false);
    }

    const versionsCmd =
      `oc exec deploy/ds-pipeline-dspa -n ${shellQuote(
        projectName,
      )} -c ds-pipeline-api-server -- ` +
      `curl --connect-timeout ${MANAGED_PIPELINE_CURL_CONNECT_TIMEOUT_SECONDS} ` +
      `--max-time ${MANAGED_PIPELINE_CURL_MAX_TIME_SECONDS} -ksSf ${shellQuote(
        `https://localhost:8888/apis/v2beta1/pipelines/${encodeURIComponent(
          pipelineId,
        )}/versions?page_size=100`,
      )} 2>/dev/null`;

    return cy
      .exec(versionsCmd, { failOnNonZeroExit: false, timeout: 30000, log: false })
      .then((result: CommandLineResult) => {
        if (result.exitCode !== 0) {
          return false;
        }

        try {
          const response = JSON.parse(result.stdout) as PipelineVersionListResponse;
          const hasVersion = (response.pipeline_versions ?? []).some(
            (version) =>
              typeof version.pipeline_version_id === 'string' && !!version.pipeline_version_id,
          );
          return hasVersion;
        } catch {
          return false;
        }
      })
      .then((ready) => (ready ? checkPipeline(index + 1) : cy.wrap(false)));
  };

  return checkPipeline(0);
};

/**
 * Wait for operator-provisioned managed pipelines to appear in KFP.
 *
 * After DSPA reports Ready=True the KFP pod asynchronously uploads pipelines
 * from its managed-pipelines config. The BFF caches discovery results for 5 min,
 * so if the first BFF request lands before pipelines exist, subsequent requests
 * (including run submission) will get a cached 404 for up to 5 minutes.
 *
 * When expected names are supplied, this function also verifies that every
 * expected pipeline has at least one usable version before returning.
 */
export const waitForManagedPipelines = (
  projectName: string,
  expectedNames: readonly string[] = [],
): void => {
  const maxAttempts = 20;
  const intervalMs = 15000;

  cy.log('Waiting for the DSPA pipeline server rollout to stabilize...');
  cy.exec(
    `oc rollout status deploy/ds-pipeline-dspa -n ${shellQuote(projectName)} --timeout=120s`,
    {
      failOnNonZeroExit: false,
      timeout: 130000,
    },
  ).then((rolloutResult: CommandLineResult) => {
    if (rolloutResult.exitCode !== 0) {
      throw new Error(`DSPA pipeline server did not stabilize in ${projectName}.`);
    }

    cy.log('Waiting for managed pipelines to be provisioned by the operator...');
    const poll = (attempt: number): void => {
      if (attempt >= maxAttempts) {
        throw new Error(
          `Managed pipelines ${expectedNames.length ? expectedNames.join(', ') : ''} ` +
            `were not ready after ${maxAttempts} attempts in ${projectName}.`,
        );
      }

      listManagedPipelines(projectName).then((pipelines) => {
        const requiredPipelines = expectedNames
          .map((name) => pipelines.find((pipeline) => pipeline.display_name === name))
          .filter((pipeline): pipeline is PipelineSummary => pipeline !== undefined);
        const namesReady =
          expectedNames.length === 0
            ? pipelines.length > 0
            : requiredPipelines.length === expectedNames.length;

        if (namesReady && expectedNames.length === 0) {
          cy.log(`Managed pipelines found (${pipelines.length}) on attempt ${attempt + 1}`);
          return;
        }

        if (namesReady) {
          hasUsablePipelineVersions(projectName, requiredPipelines).then((versionsReady) => {
            if (versionsReady) {
              cy.log(
                `Managed pipelines ${expectedNames.join(
                  ', ',
                )} and usable versions found on attempt ${attempt + 1}`,
              );
              return;
            }

            cy.log(
              `Attempt ${
                attempt + 1
              }/${maxAttempts}: managed pipeline versions are not ready, retrying...`,
            );
            // eslint-disable-next-line cypress/no-unnecessary-waiting
            cy.wait(intervalMs).then(() => poll(attempt + 1));
          });
          return;
        }

        const availableNames = pipelines.map((pipeline) => pipeline.display_name).filter(Boolean);
        cy.log(
          `Attempt ${attempt + 1}/${maxAttempts}: managed pipelines not ready (found ${
            availableNames.join(', ') || 'none'
          }), retrying...`,
        );
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(intervalMs).then(() => poll(attempt + 1));
      });
    };

    poll(0);
  });
};

export const waitForAutoragManagedPipelines = (projectName: string): void => {
  waitForManagedPipelines(projectName, AUTORAG_MANAGED_PIPELINE_NAMES);
};
