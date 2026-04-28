import yaml from 'js-yaml';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { deleteS3TestFiles } from '../../../utils/oc_commands/s3Cleanup';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { provisionProjectForAutoX } from '../../../utils/autoXPipelines';
import { createLlamaStackSecret } from '../../../utils/oc_commands/llamaStackSecret';
import { waitForDspaReady } from '../../../utils/oc_commands/dspa';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { AutoragTestData } from '../../../types';
import {
  autoragExperimentsPage,
  autoragConfigurePage,
  autoragResultsPage,
} from '../../../pages/autorag';

const uuid = generateTestUUID();

describe('AutoRAG Experiments List and Run Management E2E', { testIsolation: false }, () => {
  let testData: AutoragTestData;
  let projectName: string;

  retryableBefore(() =>
    cy
      .fixture('e2e/autorag/testAutoragExperimentsAndRunManagement.yaml', 'utf8')
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
    'Shows empty state and create run button on experiments page',
    { tags: ['@AutoRAG', '@AutoRAGRegression'] },
    () => {
      cy.step('Login and wait for pipeline server');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      waitForDspaReady(projectName);

      cy.step('Navigate to AutoRAG experiments page');
      autoragExperimentsPage.visit(projectName);

      cy.step('Verify empty state is displayed');
      autoragExperimentsPage.findEmptyState(120000).should('exist');

      cy.step('Verify create run button is available');
      autoragExperimentsPage.findCreateRunButton().should('be.visible');

      cy.step('Verify AutoRAG nav item is present');
      autoragExperimentsPage.findNavItem().should('be.visible');
    },
  );

  it(
    'Can submit a run and verify it appears in the experiments list',
    { tags: ['@AutoRAG', '@AutoRAGRegression'] },
    () => {
      autoragConfigurePage.submitRunSetup(testData, projectName, uuid);

      cy.step('Set max RAG patterns to minimize run time');
      autoragConfigurePage.setMaxRagPatterns(testData.maxRagPatterns);

      autoragConfigurePage.submitRun();

      cy.step('Navigate back to experiments page and verify run appears');
      autoragExperimentsPage.visit(projectName);
      autoragResultsPage.findRunsTable().should('be.visible');
      autoragResultsPage.findRunsTable().should('contain.text', testData.runName);
    },
  );

  it(
    'Can stop a running experiment from the results page',
    { tags: ['@AutoRAG', '@AutoRAGRegression'] },
    () => {
      cy.step('Click on the run to go to results page');
      autoragResultsPage.findRunsTable().contains(testData.runName).click();

      cy.step('Verify run is in progress');
      autoragResultsPage.findRunInProgressMessage().should('be.visible');

      cy.step('Click stop button and confirm');
      autoragResultsPage.findStopRunButton().click();
      autoragResultsPage.findStopRunModal().should('be.visible');
      autoragResultsPage.findConfirmStopRunButton().click();

      cy.step('Verify run status shows as canceling, canceled, or failed');
      autoragResultsPage
        .findRunStatusLabel(80000)
        .invoke('text')
        .should('match', /CANCEL|FAIL/i);
    },
  );
});
