import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { deleteAutoXS3TestFiles } from '../../../utils/oc_commands/autoXS3Cleanup';
import { provisionProjectForAutoX } from '../../../utils/autoXPipelines';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { resolveAutoXS3Endpoint } from '../../../utils/autoXS3';
import { runAwsCliInCluster } from '../../../utils/oc_commands/s3Cleanup';
import { maskSensitiveInfo } from '../../../utils/maskSensitiveInfo';
import type { AWSS3Buckets, AutoragTestData } from '../../../types';
import { autoragConfigurePage } from '../../../pages/autorag/configurePage';
import { cleanupAutoragInfrastructure } from '../../../utils/oc_commands/autoragInfra';
import {
  configureAutoragRun,
  checkAutoragMaaSReadiness,
  submitAutoragRun,
  getAutoragInputDataKey,
} from '../../../utils/autoragTestFlows';
import type {
  AutoragConnectionOwnership,
  AutoragMaaSFixture,
} from '../../../utils/autoragTestFlows';

const uuid = generateTestUUID();
const defaultUuid = `${uuid}-default`;
const faithUuid = `${uuid}-faith`;
const overallUuid = `${uuid}-overall`;

type AutoragS3UploadDiagnostic = {
  namespace: string;
  secretName: string;
  bucket: string;
  endpointHost: string;
  region: string;
  statusCode?: number;
  uploaded?: boolean;
  key?: string;
};

const getEndpointHost = (endpoint: string | undefined): string => {
  if (!endpoint) {
    return '(unknown)';
  }

  try {
    return new URL(endpoint).host || '(unknown)';
  } catch {
    return '(invalid endpoint)';
  }
};

const getUploadErrorMessage = (body: unknown): string | undefined => {
  if (typeof body !== 'object' || body === null) {
    return undefined;
  }

  const payload = body as Record<string, unknown>;
  if (typeof payload.message === 'string') {
    return payload.message;
  }
  if (typeof payload.error === 'string') {
    return payload.error;
  }
  if (typeof payload.error === 'object' && payload.error !== null) {
    const error = payload.error as Record<string, unknown>;
    return typeof error.message === 'string' ? error.message : undefined;
  }
  return undefined;
};

describe('AutoRAG Metric Variations E2E', { testIsolation: false }, () => {
  let testData: AutoragTestData;
  let projectName: string;
  let cleanupReady = false;
  let uploadDiagnostic: AutoragS3UploadDiagnostic | undefined;
  let maasFixture: AutoragMaaSFixture | undefined;
  const connectionOwnership: AutoragConnectionOwnership = {
    maasSecretCreated: false,
    vectorDbSecretCreated: false,
  };
  const getMaaSFixture = (): AutoragMaaSFixture => {
    if (!maasFixture) {
      throw new Error('AutoRAG MaaS fixture was not resolved.');
    }
    return maasFixture;
  };

  beforeEach(() => {
    uploadDiagnostic = undefined;
    cy.intercept('POST', '**/autorag/api/v1/s3/files/**', (request) => {
      const requestUrl = new URL(request.url);
      const configuredBuckets = Cypress.env('AWS_PIPELINES') as AWSS3Buckets | undefined;
      const bucketConfig = configuredBuckets?.[testData.awsBucket];
      const endpoint = bucketConfig ? resolveAutoXS3Endpoint(bucketConfig.ENDPOINT) : undefined;
      const diagnostic: AutoragS3UploadDiagnostic = {
        namespace: requestUrl.searchParams.get('namespace') ?? '(missing)',
        secretName: requestUrl.searchParams.get('secretName') ?? '(missing)',
        bucket:
          requestUrl.searchParams.get('bucket') || bucketConfig?.NAME || '(secret default unknown)',
        endpointHost: getEndpointHost(endpoint),
        region: bucketConfig?.REGION ?? '(unknown)',
      };
      uploadDiagnostic = diagnostic;

      request.on('response', (response) => {
        const body = response.body as { uploaded?: unknown; key?: unknown } | undefined;
        const uploaded = body?.uploaded === true;
        const key = typeof body?.key === 'string' ? body.key : undefined;
        const errorMessage = getUploadErrorMessage(response.body);
        uploadDiagnostic = {
          ...diagnostic,
          statusCode: response.statusCode,
          uploaded,
          key,
        };

        Cypress.log({
          name: 'AutoRAG S3 upload',
          message: [
            `HTTP ${response.statusCode}`,
            `uploaded=${uploaded}`,
            `bucket=${diagnostic.bucket}`,
            `region=${diagnostic.region}`,
            `endpoint=${diagnostic.endpointHost}`,
            `secret=${diagnostic.secretName}`,
            `namespace=${diagnostic.namespace}`,
            `key=${key ?? '(missing)'}`,
            ...(errorMessage
              ? [`responseMessage=${maskSensitiveInfo(errorMessage).slice(0, 500)}`]
              : []),
          ].join('; '),
        });
      });
    });
  });

  retryableBefore(() =>
    cy
      .fixture('e2e/autorag/testAutoragMetricVariations.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as AutoragTestData;
        projectName = `${testData.projectNamePrefix}-${uuid}`;
        cleanupReady = true;
      })
      .then(() => checkAutoragMaaSReadiness())
      .then((fixture) => {
        maasFixture = fixture;
        provisionProjectForAutoX(projectName, testData.dspaSecretName, testData.awsBucket);
        configureAutoragRun(testData, projectName, uuid, fixture, {
          createConnections: true,
          connectionOwnership,
        });
      }),
  );

  afterEach(function collectS3UsageAfterFailedUpload() {
    const diagnostic = uploadDiagnostic;
    if (this.currentTest?.state !== 'failed' || !diagnostic) {
      return;
    }

    const configuredBuckets = Cypress.env('AWS_PIPELINES') as AWSS3Buckets | undefined;
    const bucketConfig = configuredBuckets?.[testData.awsBucket];
    if (!bucketConfig?.NAME || !bucketConfig.ENDPOINT) {
      cy.log('Skipping S3 usage summary: AutoRAG bucket configuration is unavailable.');
      return;
    }

    if (diagnostic.namespace === '(missing)') {
      cy.log('Skipping S3 usage summary: upload request did not include a namespace.');
      return;
    }

    if (diagnostic.bucket !== bucketConfig.NAME) {
      cy.log(
        `Skipping S3 usage summary: upload target ${diagnostic.bucket} does not match configured bucket ${bucketConfig.NAME}.`,
      );
      return;
    }

    const endpoint = resolveAutoXS3Endpoint(bucketConfig.ENDPOINT);
    cy.step('Collect S3 bucket usage after failed AutoRAG test');
    return runAwsCliInCluster({
      namespace: diagnostic.namespace,
      podName: `s3-usage-${Date.now()}`,
      region: bucketConfig.REGION,
      awsCliArgs: [
        's3api',
        'list-objects-v2',
        '--bucket',
        bucketConfig.NAME,
        '--query',
        '{Objects: length(Contents || `[]`), Bytes: sum(Contents[].Size || `[]`)}',
        '--output',
        'json',
        '--endpoint-url',
        endpoint,
      ],
      timeout: 120000,
    }).then((result) => {
      let summary = `summary unavailable (aws cli exit ${result.exitCode})`;
      if (result.exitCode === 0) {
        try {
          const usage = JSON.parse(result.stdout) as { Objects?: unknown; Bytes?: unknown };
          summary = `objects=${String(usage.Objects ?? 'unknown')}; bytes=${String(
            usage.Bytes ?? 'unknown',
          )}`;
        } catch {
          summary = 'summary unavailable (invalid aws cli response)';
        }
      }
      Cypress.log({
        name: 'AutoRAG S3 bucket usage',
        message: [
          `bucket=${bucketConfig.NAME}`,
          `region=${bucketConfig.REGION}`,
          `endpoint=${getEndpointHost(endpoint)}`,
          `namespace=${diagnostic.namespace}`,
          summary,
        ].join('; '),
      });
    });
  });

  after(() => {
    if (!cleanupReady) {
      return;
    }

    cleanupAutoragInfrastructure(
      projectName,
      testData.maasSecretName,
      testData.vectorDbSecretName,
      connectionOwnership,
    );
    deleteAutoXS3TestFiles(projectName, testData.awsBucket, `*${uuid}*`);
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Can submit a run with untouched default metric (overall_score)',
    { tags: ['@AutoRAG', '@AutoRAGRegression', '@AutoRAGCI', '@Featureflagged'] },
    () => {
      configureAutoragRun(
        { ...testData, runName: `${testData.runName}-default` },
        projectName,
        defaultUuid,
        getMaaSFixture(),
        {},
      );

      cy.step('Set max RAG patterns without changing the default metric');
      autoragConfigurePage
        .findMaxRagPatternsInputField()
        .type(`{selectall}${testData.maxRagPatterns}`);

      submitAutoragRun(
        { ...testData, runName: `${testData.runName}-default` },
        projectName,
        getAutoragInputDataKey(testData, defaultUuid),
        getMaaSFixture(),
      );
    },
  );

  it(
    'Can submit a run with answer_correctness metric',
    { tags: ['@AutoRAG', '@AutoRAGRegression', '@AutoRAGCI', '@Featureflagged'] },
    () => {
      configureAutoragRun(testData, projectName, uuid, getMaaSFixture());

      cy.step('Select answer_correctness optimization metric');
      autoragConfigurePage.findOptimizationMetricSelect().click();
      autoragConfigurePage.findMetricOption('unitxt:answer_correctness').click();

      cy.step('Set max RAG patterns');
      autoragConfigurePage
        .findMaxRagPatternsInputField()
        .type(`{selectall}${testData.maxRagPatterns}`);

      submitAutoragRun(
        { ...testData, optimizationMetric: 'unitxt:answer_correctness' },
        projectName,
        getAutoragInputDataKey(testData, uuid),
        getMaaSFixture(),
      );
    },
  );

  it(
    'Can submit a run with faithfulness metric',
    { tags: ['@AutoRAG', '@AutoRAGRegression', '@AutoRAGCI', '@Featureflagged'] },
    () => {
      configureAutoragRun(
        { ...testData, runName: `${testData.runName}-faith` },
        projectName,
        faithUuid,
        getMaaSFixture(),
        {},
      );

      cy.step('Select faithfulness optimization metric');
      autoragConfigurePage.findOptimizationMetricSelect().click();
      autoragConfigurePage.findMetricOption('unitxt:faithfulness').click();

      cy.step('Set max RAG patterns');
      autoragConfigurePage
        .findMaxRagPatternsInputField()
        .type(`{selectall}${testData.maxRagPatterns}`);

      submitAutoragRun(
        {
          ...testData,
          runName: `${testData.runName}-faith`,
          optimizationMetric: 'unitxt:faithfulness',
        },
        projectName,
        getAutoragInputDataKey(testData, faithUuid),
        getMaaSFixture(),
      );
    },
  );

  it(
    'Can submit a run with overall_score metric',
    { tags: ['@AutoRAG', '@AutoRAGRegression', '@AutoRAGCI', '@Featureflagged'] },
    () => {
      configureAutoragRun(
        { ...testData, runName: `${testData.runName}-overall` },
        projectName,
        overallUuid,
        getMaaSFixture(),
        {},
      );

      cy.step('Select overall_score optimization metric');
      autoragConfigurePage.findOptimizationMetricSelect().click();
      autoragConfigurePage.findMetricOption('custom:overall_score').click();

      cy.step('Set max RAG patterns');
      autoragConfigurePage
        .findMaxRagPatternsInputField()
        .type(`{selectall}${testData.maxRagPatterns}`);

      submitAutoragRun(
        { ...testData, runName: `${testData.runName}-overall` },
        projectName,
        getAutoragInputDataKey(testData, overallUuid),
        getMaaSFixture(),
      );
    },
  );
});
