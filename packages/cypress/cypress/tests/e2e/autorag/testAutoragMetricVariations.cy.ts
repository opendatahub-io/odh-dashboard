import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { deleteS3TestFiles } from '../../../utils/oc_commands/s3Cleanup';
import { provisionProjectForAutoX } from '../../../utils/autoXPipelines';
import { createLlamaStackSecret } from '../../../utils/oc_commands/llamaStackSecret';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { AutoragTestData } from '../../../types';
import {
  autoragExperimentsPage,
  autoragConfigurePage,
  autoragResultsPage,
} from '../../../pages/autorag';

const uuid = generateTestUUID();

describe('AutoRAG Metric Variations E2E', { testIsolation: false }, () => {
  let testData: AutoragTestData;
  let projectName: string;

  retryableBefore(() =>
    cy
      .fixture('e2e/autorag/testAutoragMetricVariations.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as AutoragTestData;
        projectName = `${testData.projectNamePrefix}-${uuid}`;
        provisionProjectForAutoX(projectName, testData.dspaSecretName, testData.awsBucket);

        const llamaStackUrl = Cypress.env('LLAMA_STACK_URL') as string;
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
    'Can submit a run with answer_correctness metric',
    { tags: ['@AutoRAG', '@AutoRAGRegression'] },
    () => {
      autoragConfigurePage.submitRunSetup(testData, projectName, uuid);

      cy.step('Select answer_correctness optimization metric');
      autoragConfigurePage.findOptimizationMetricSelect().click();
      autoragConfigurePage.findMetricOption('answer_correctness').click();

      cy.step('Set max RAG patterns');
      autoragConfigurePage.setMaxRagPatterns(testData.maxRagPatterns);

      autoragConfigurePage.submitRun();

      cy.step('Navigate back and verify run appears');
      autoragExperimentsPage.visit(projectName);
      autoragResultsPage.findRunsTable().should('contain.text', testData.runName);
    },
  );

  it(
    'Can submit a run with faithfulness metric',
    { tags: ['@AutoRAG', '@AutoRAGRegression'] },
    () => {
      cy.step('Click Create run from experiments page');
      autoragExperimentsPage.findHeaderCreateRunButton().click();

      cy.step('Fill name and select LlamaStack secret');
      autoragConfigurePage.findNameInput().type(`${testData.runName}-faith`);
      autoragConfigurePage.findDescriptionInput().type(testData.runDescription);
      autoragConfigurePage.findLlamaStackSecretSelector().click();
      autoragConfigurePage.findLlamaStackSecretSelector().type(testData.llamaStackSecretName);
      autoragConfigurePage.findSelectOption(new RegExp(testData.llamaStackSecretName, 'i')).click();

      cy.step('Click Next');
      autoragConfigurePage.findNextButton().click();

      cy.step('Select S3 connection');
      autoragConfigurePage.findSecretSelector().click();
      autoragConfigurePage.findSecretSelector().type(testData.s3SecretName);
      autoragConfigurePage.findSelectOption(new RegExp(testData.s3SecretName, 'i')).click();

      cy.step('Browse and select the document uploaded by the first test');
      const uploadFileName = `${testData.documentFile.replace('.txt', '')}-${uuid}.txt`;
      autoragConfigurePage.findBrowseBucketButton().click();
      autoragConfigurePage.findFileExplorerTable().should('be.visible');
      autoragConfigurePage.findFileExplorerSearch().type(uploadFileName);
      autoragConfigurePage
        .findFileExplorerTable()
        .contains('td', uploadFileName)
        .should('be.visible')
        .click();
      autoragConfigurePage.findFileExplorerSelectBtn().click();

      cy.step('Upload evaluation dataset JSON');
      const evalFileName = `${testData.evaluationFile.replace('.json', '')}-${uuid}-faith.json`;
      autoragConfigurePage
        .findEvaluationFileInput()
        .selectFile(
          { contents: `resources/autorag/${testData.evaluationFile}`, fileName: evalFileName },
          { force: true },
        );

      cy.step('Select vector store');
      autoragConfigurePage.findVectorStoreSelector().click();
      autoragConfigurePage.findFirstVectorStoreOption().click();

      cy.step('Select faithfulness optimization metric');
      autoragConfigurePage.findOptimizationMetricSelect().click();
      autoragConfigurePage.findMetricOption('faithfulness').click();

      cy.step('Set max RAG patterns');
      autoragConfigurePage.setMaxRagPatterns(testData.maxRagPatterns);

      autoragConfigurePage.submitRun();
    },
  );
});
