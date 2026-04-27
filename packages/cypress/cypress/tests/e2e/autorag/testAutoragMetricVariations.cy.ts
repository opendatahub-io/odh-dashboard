import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
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
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Can submit a run with answer_correctness metric',
    { tags: ['@AutoRAG', '@AutoRAGRegression'] },
    () => {
      autoragConfigurePage.submitRunSetup(testData, projectName);

      cy.step('Select answer_correctness optimization metric');
      autoragConfigurePage.findOptimizationMetricSelect().click();
      autoragConfigurePage.findMetricOption('answer_correctness').click();

      cy.step('Set max RAG patterns');
      autoragConfigurePage.setMaxRagPatterns(testData.maxRagPatterns as number);

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
      autoragConfigurePage.submitRunSetup(testData, projectName);

      cy.step('Change run name to avoid duplicate');
      autoragConfigurePage.findNameInput().clear().type(`${testData.runName}-faith`);

      cy.step('Select faithfulness optimization metric');
      autoragConfigurePage.findOptimizationMetricSelect().click();
      autoragConfigurePage.findMetricOption('faithfulness').click();

      cy.step('Set max RAG patterns');
      autoragConfigurePage.setMaxRagPatterns(testData.maxRagPatterns as number);

      autoragConfigurePage.submitRun();
    },
  );
});
