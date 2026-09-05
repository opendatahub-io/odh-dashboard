import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { deleteS3TestFiles } from '../../../utils/oc_commands/s3Cleanup';
import { provisionProjectForAutoX } from '../../../utils/autoXPipelines';
import {
  createMaasSecret,
  isExternalMaasConnection,
  getExternalMaasConnection,
} from '../../../utils/oc_commands/maasSecret';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { AutoragTestData } from '../../../types';
import { autoragConfigurePage } from '../../../pages/autorag/configurePage';
import { isAutoragEnabled, setAutoragEnabled } from '../../../utils/oc_commands/autoX';
import { allowOgxAccess, removeOgxAccess } from '../../../utils/oc_commands/ogxNetworkPolicy';
import {
  isOgxOperatorManaged,
  provisionAutoragInfrastructure,
  cleanupAutoragInfrastructure,
  provisionVectorDatabase,
} from '../../../utils/oc_commands/autoragInfra';
import {
  configureAutoragRun,
  submitAutoragRun,
  verifyAutoragRunSubmitted,
} from '../../../utils/autoragTestFlows';

const uuid = generateTestUUID();
const defaultUuid = `${uuid}-default`;
const faithUuid = `${uuid}-faith`;
const overallUuid = `${uuid}-overall`;

const isExternalMaas = (): boolean => isExternalMaasConnection();

describe('AutoRAG Metric Variations E2E', { testIsolation: false }, () => {
  let testData: AutoragTestData;
  let projectName: string;
  let autoragWasEnabled = false;
  let selfProvisioned = false;

  retryableBefore(() =>
    cy
      .fixture('e2e/autorag/testAutoragMetricVariations.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as AutoragTestData;
        projectName = `${testData.projectNamePrefix}-${uuid}`;
      })
      .then(() =>
        isAutoragEnabled().then((wasEnabled) => {
          autoragWasEnabled = wasEnabled;
        }),
      )
      .then(() => setAutoragEnabled(true))
      .then(() =>
        isOgxOperatorManaged().then((isManaged) => {
          if (isExternalMaas()) {
            provisionProjectForAutoX(projectName, testData.dspaSecretName, testData.awsBucket);
            allowOgxAccess(projectName);

            const connection = getExternalMaasConnection();
            if (!connection) {
              throw new Error('Expected MAAS_URL or OGX_URL for external mode');
            }
            createMaasSecret(
              projectName,
              testData.maasSecretName,
              connection.url,
              connection.apiKey,
            );
            provisionVectorDatabase(projectName, testData.vectorDbSecretName);
          } else {
            if (!isManaged) {
              throw new Error(
                'OGX operator is not Managed on this cluster. ' +
                  'Either set MAAS_URL or OGX_URL for external mode or ensure the operator is Managed.',
              );
            }

            selfProvisioned = true;

            cy.step('Provision project with DSPA');
            provisionProjectForAutoX(projectName, testData.dspaSecretName, testData.awsBucket);

            cy.step('Provision AutoRAG infrastructure (models, Milvus, OGX)');
            provisionAutoragInfrastructure(
              projectName,
              testData.maasSecretName,
              testData.vectorDbSecretName,
            );
          }
        }),
      ),
  );

  after(() => {
    if (!autoragWasEnabled) {
      setAutoragEnabled(false);
    }
    if (selfProvisioned) {
      cleanupAutoragInfrastructure(
        projectName,
        testData.maasSecretName,
        testData.vectorDbSecretName,
      );
    }
    removeOgxAccess(projectName);
    deleteS3TestFiles(projectName, testData.awsBucket, `*${uuid}*`);
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Can submit a run with untouched default metric (overall_score)',
    { tags: ['@AutoRAG', '@AutoRAGRegression', '@Featureflagged'] },
    () => {
      configureAutoragRun(
        { ...testData, runName: `${testData.runName}-default` },
        projectName,
        defaultUuid,
      );

      cy.step('Set max RAG patterns without changing the default metric');
      autoragConfigurePage
        .findMaxRagPatternsInputField()
        .type(`{selectall}${testData.maxRagPatterns}`);

      submitAutoragRun();
      verifyAutoragRunSubmitted(projectName, `${testData.runName}-default`);
    },
  );

  it(
    'Can submit a run with answer_correctness metric',
    { tags: ['@AutoRAG', '@AutoRAGRegression', '@Featureflagged'] },
    () => {
      configureAutoragRun(testData, projectName, uuid);

      cy.step('Select answer_correctness optimization metric');
      autoragConfigurePage.findOptimizationMetricSelect().click();
      autoragConfigurePage.findMetricOption('answer_correctness').click();

      cy.step('Set max RAG patterns');
      autoragConfigurePage
        .findMaxRagPatternsInputField()
        .type(`{selectall}${testData.maxRagPatterns}`);

      submitAutoragRun();
      verifyAutoragRunSubmitted(projectName, testData.runName);
    },
  );

  it(
    'Can submit a run with faithfulness metric',
    { tags: ['@AutoRAG', '@AutoRAGRegression', '@Featureflagged'] },
    () => {
      configureAutoragRun(
        { ...testData, runName: `${testData.runName}-faith` },
        projectName,
        faithUuid,
      );

      cy.step('Select faithfulness optimization metric');
      autoragConfigurePage.findOptimizationMetricSelect().click();
      autoragConfigurePage.findMetricOption('faithfulness').click();

      cy.step('Set max RAG patterns');
      autoragConfigurePage
        .findMaxRagPatternsInputField()
        .type(`{selectall}${testData.maxRagPatterns}`);

      submitAutoragRun();
      verifyAutoragRunSubmitted(projectName, `${testData.runName}-faith`);
    },
  );

  it(
    'Can submit a run with overall_score metric',
    { tags: ['@AutoRAG', '@AutoRAGRegression', '@Featureflagged'] },
    () => {
      configureAutoragRun(
        { ...testData, runName: `${testData.runName}-overall` },
        projectName,
        overallUuid,
      );

      cy.step('Select overall_score optimization metric');
      autoragConfigurePage.findOptimizationMetricSelect().click();
      autoragConfigurePage.findMetricOption('overall_score').click();

      cy.step('Set max RAG patterns');
      autoragConfigurePage
        .findMaxRagPatternsInputField()
        .type(`{selectall}${testData.maxRagPatterns}`);

      submitAutoragRun();
      verifyAutoragRunSubmitted(projectName, `${testData.runName}-overall`);
    },
  );
});
