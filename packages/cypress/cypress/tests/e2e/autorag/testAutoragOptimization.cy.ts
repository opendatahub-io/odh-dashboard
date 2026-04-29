import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { deleteS3TestFiles } from '../../../utils/oc_commands/s3Cleanup';
import { provisionProjectForAutoX } from '../../../utils/autoXPipelines';
import { createLlamaStackSecret } from '../../../utils/oc_commands/llamaStackSecret';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { AutoragTestData } from '../../../types';
import { autoragConfigurePage, autoragResultsPage } from '../../../pages/autorag';

const uuid = generateTestUUID();

describe('AutoRAG Optimization E2E', { testIsolation: false }, () => {
  let testData: AutoragTestData;
  let projectName: string;

  retryableBefore(() =>
    cy.fixture('e2e/autorag/testAutoragOptimization.yaml', 'utf8').then((yamlContent: string) => {
      testData = yaml.load(yamlContent) as AutoragTestData;
      projectName = `${testData.projectNamePrefix}-${uuid}`;
      provisionProjectForAutoX(projectName, testData.dspaSecretName, testData.awsBucket);

      const llamaStackUrl = Cypress.env('LLAMA_STACK_URL') as string | undefined;
      if (!llamaStackUrl) {
        throw new Error('LLAMA_STACK_URL must be set in test-variables.yml');
      }
      const llamaStackApiKey = (Cypress.env('LLAMA_STACK_API_KEY') as string) || '';
      createLlamaStackSecret(
        projectName,
        testData.llamaStackSecretName,
        llamaStackUrl,
        llamaStackApiKey,
      );
    }),
  );

  after(() => {
    deleteS3TestFiles(projectName, testData.awsBucket, `*${uuid}*`);
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Can create and submit a full AutoRAG optimization run',
    { tags: ['@AutoRAG', '@AutoRAGRegression'] },
    () => {
      autoragConfigurePage.submitRunSetup(testData, projectName, uuid);

      cy.step('Set max RAG patterns to minimize run time');
      autoragConfigurePage.setMaxRagPatterns(testData.maxRagPatterns);

      autoragConfigurePage.submitRun();
    },
  );

  it(
    'Verify optimization run completes with leaderboard',
    { tags: ['@AutoRAG', '@AutoRAGRegression'] },
    () => {
      cy.step('Wait for run to complete and verify leaderboard');
      autoragResultsPage.waitForRunCompletion();
    },
  );

  it(
    'Can interact with results page (leaderboard, pattern details, download)',
    { tags: ['@AutoRAG', '@AutoRAGRegression'] },
    () => {
      autoragResultsPage.verifyResultsInteraction();
    },
  );
});
