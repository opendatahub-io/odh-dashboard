import { LDAP_ADMIN_USER } from './e2eUsers';
import { waitForEvaluationJobComplete } from './oc_commands/evalHubInstance';
import { evaluationsPage } from '../pages/evalHub/evaluationsPage';
import { createEvaluationPage } from '../pages/evalHub/createEvaluationPage';
import { evaluationResultsPage } from '../pages/evalHub/evaluationResultsPage';

export type SingleBenchmarkEvaluationOptions = {
  benchmarkCardTitle: string;
  evaluationRunName: string;
  inferenceServiceName: string;
  additionalBenchmarkParams?: string;
};

export type BenchmarkSuiteEvaluationOptions = {
  collectionId: string;
  collectionName: string;
  evaluationRunName: string;
  inferenceServiceName: string;
  additionalBenchmarkParams?: string;
};

export const navigateToEvaluationsPage = (evaluationTenantProject: string): void => {
  cy.step('Log into the application and open Evaluations page');
  cy.visitWithLogin(
    evaluationsPage.pathWithLmEvalDevFlags(evaluationTenantProject),
    LDAP_ADMIN_USER,
  );
  cy.url().should('include', `/evaluation/${evaluationTenantProject}`);
  evaluationsPage.findPageTitle().should('be.visible').and('contain.text', 'Evaluations');
  evaluationsPage.findCreateEvaluationButton().should('be.visible');
};

export const submitSingleBenchmarkEvaluation = (opts: SingleBenchmarkEvaluationOptions): void => {
  const { benchmarkCardTitle, evaluationRunName, inferenceServiceName, additionalBenchmarkParams } =
    opts;

  cy.step('Open create evaluation wizard and select single benchmark');
  evaluationsPage.findCreateEvaluationButton().click();
  createEvaluationPage.findStandardisedBenchmarksCard().should('be.visible').click();
  cy.url().should('include', '/create/benchmarks');
  createEvaluationPage.findBenchmarksGallery({ timeout: 120000 }).should('be.visible');

  cy.step(`Select benchmark: ${benchmarkCardTitle}`);
  createEvaluationPage
    .findBenchmarkCardByTitle(benchmarkCardTitle)
    .scrollIntoView()
    .within(() => {
      createEvaluationPage.findSelectBenchmarkButton().click();
    });
  createEvaluationPage.findStartEvaluationForm().should('exist', { timeout: 120000 });

  cy.step('Enter evaluation name');
  createEvaluationPage.findBenchmarkNameDisplay().should('contain.text', benchmarkCardTitle);
  createEvaluationPage.findEvaluationNameInput().clear().type(evaluationRunName);

  cy.step('Select deployed model from cluster picker');
  createEvaluationPage.findModelPickerToggle().click();
  createEvaluationPage.findModelOption(inferenceServiceName).click();

  if (additionalBenchmarkParams?.trim()) {
    cy.step('Add benchmark parameters');
    createEvaluationPage.findBenchmarkParametersCheckbox().check({ force: true });
    createEvaluationPage
      .findAdditionalBenchmarkParamsTextarea()
      .should('be.visible')
      .clear()
      .type(additionalBenchmarkParams.trim(), { parseSpecialCharSequences: false });
  }

  cy.step('Submit evaluation and confirm it appears in the list');
  createEvaluationPage.findStartEvaluationSubmitButton().should('be.enabled').click();
  cy.url({ timeout: 120000 }).should('not.include', '/create');
  evaluationsPage.findEvaluationsTable().should('contain', evaluationRunName);
};

export const submitBenchmarkSuiteEvaluation = (opts: BenchmarkSuiteEvaluationOptions): void => {
  const {
    collectionId,
    collectionName,
    evaluationRunName,
    inferenceServiceName,
    additionalBenchmarkParams,
  } = opts;

  cy.step('Open create evaluation wizard and select benchmark suite');
  evaluationsPage.findCreateEvaluationButton().click();
  createEvaluationPage.findEvaluationCollectionsCard().should('be.visible').click();
  cy.url().should('include', '/create/collections');
  createEvaluationPage.findCollectionsGallery({ timeout: 120000 }).should('be.visible');

  cy.step(`Select collection: ${collectionName}`);
  createEvaluationPage
    .findCollectionCard(collectionId)
    .scrollIntoView()
    .within(() => {
      createEvaluationPage.findUseBenchmarkSuiteButton().click();
    });
  createEvaluationPage.findStartEvaluationForm().should('exist', { timeout: 120000 });

  cy.step('Enter evaluation name');
  createEvaluationPage.findBenchmarkNameDisplay().should('contain.text', collectionName);
  createEvaluationPage.findEvaluationNameInput().clear().type(evaluationRunName);

  cy.step('Select deployed model from cluster picker');
  createEvaluationPage.findModelPickerToggle().click();
  createEvaluationPage.findModelOption(inferenceServiceName).click();

  if (additionalBenchmarkParams?.trim()) {
    cy.step('Add benchmark parameters');
    createEvaluationPage.findBenchmarkParametersCheckbox().check({ force: true });
    createEvaluationPage
      .findAdditionalBenchmarkParamsTextarea()
      .should('be.visible')
      .clear()
      .type(additionalBenchmarkParams.trim(), { parseSpecialCharSequences: false });
  }

  cy.step('Submit evaluation and confirm it appears in the list');
  createEvaluationPage.findStartEvaluationSubmitButton().should('be.enabled').click();
  cy.url({ timeout: 120000 }).should('not.include', '/create');
  evaluationsPage.findEvaluationsTable().should('contain', evaluationRunName);
};

export const verifyEvaluationProgressModal = (evaluationRunName: string): void => {
  cy.step('Open status modal and verify progress tab is visible');
  evaluationsPage.findEvaluationStatusButtonInRow(evaluationRunName).click();
  evaluationsPage.findStatusModal().should('be.visible');
  evaluationsPage.findStatusModalProgressContent().should('be.visible');

  cy.step('Switch to events log tab and verify it activates without error');
  evaluationsPage.findStatusModalEventsLogTab().click();
  evaluationsPage.findStatusModalEventsLogTab().should('have.attr', 'aria-selected', 'true');
  evaluationsPage.findStatusModalCloseButton().click();
  evaluationsPage.findStatusModal().should('not.exist');
};

export const verifyEvaluationCompletedAndViewResults = (
  evaluationRunName: string,
  evaluationTenantProject: string,
): void => {
  cy.step('Re-open status modal after completion — View Results shown, Stop absent');
  cy.reload();
  evaluationsPage.findPageTitle().should('be.visible', { timeout: 30000 });
  evaluationsPage.findEvaluationStatusButtonInRow(evaluationRunName).click();
  evaluationsPage.findStatusModal().should('be.visible');
  evaluationsPage.findStatusModalStopButton().should('not.exist');
  evaluationsPage.findStatusModalViewResultsButton().should('be.visible').click();

  cy.step('Verify evaluation results page renders with score and metadata');
  evaluationResultsPage.findResultsContent().should('be.visible');
  evaluationResultsPage.findScoreValue().should('be.visible');
  evaluationResultsPage.findMetadata().should('be.visible');
  evaluationResultsPage.findBenchmarkDetailsInfo().should('be.visible');

  cy.step('Verify About this result popover opens');
  evaluationResultsPage.findFirstAboutResultButton().click();
  cy.findByRole('dialog').should('be.visible');
  cy.findByRole('dialog').find('button[aria-label="Close"]').click();

  cy.step('Open event log modal and verify it renders');
  evaluationResultsPage.findViewLogButton().click();
  evaluationResultsPage.findEventLogModal().should('be.visible');
  evaluationResultsPage.findLogContent().should('be.visible');
  evaluationResultsPage.findEventLogModal().find('button[aria-label="Close"]').click();

  cy.step('Return to evaluations list and verify Complete status');
  cy.visitWithLogin(
    evaluationsPage.pathWithLmEvalDevFlags(evaluationTenantProject),
    LDAP_ADMIN_USER,
  );
  evaluationsPage
    .findEvaluationStatusButtonInRow(evaluationRunName)
    .should('contain.text', 'Complete');
};

export const stopAndReconfigureEvaluation = (
  evaluationRunName: string,
  reconfiguredRunName: string,
): void => {
  cy.step('Open status modal and stop the running evaluation');
  evaluationsPage.findEvaluationStatusButtonInRow(evaluationRunName).click();
  evaluationsPage.findStatusModal().should('be.visible');
  evaluationsPage.findStatusModalStopButton().should('be.visible').click();

  cy.step('Confirm stop in the stop evaluation modal');
  evaluationsPage.findStopModal().should('be.visible');
  evaluationsPage.findStopConfirmButton().click();
  evaluationsPage.findStopModal().should('not.exist');

  cy.step('Wait for evaluation to reach Stopped status');
  cy.reload();
  evaluationsPage.findPageTitle().should('be.visible', { timeout: 30000 });
  evaluationsPage
    .findEvaluationStatusButtonInRow(evaluationRunName)
    .should('not.contain.text', 'Stopping', { timeout: 120000 });
  evaluationsPage
    .findEvaluationStatusButtonInRow(evaluationRunName)
    .should('contain.text', 'Cancelled', { timeout: 30000 });

  cy.step('Open status modal and click Reconfigure');
  evaluationsPage.findEvaluationStatusButtonInRow(evaluationRunName).click();
  evaluationsPage.findStatusModal().should('be.visible');
  evaluationsPage.findStatusModalReconfigureButton().should('be.visible').click();

  cy.step(`Submit the reconfigured evaluation run as "${reconfiguredRunName}"`);
  cy.url().should('include', '/reconfigure');
  createEvaluationPage.findStartEvaluationForm().should('exist', { timeout: 30000 });
  createEvaluationPage.findEvaluationNameInput().clear().type(reconfiguredRunName);
  createEvaluationPage.findStartEvaluationSubmitButton().should('be.enabled').click();
  cy.url({ timeout: 120000 }).should('not.include', '/reconfigure');
  evaluationsPage.findEvaluationsTable({ timeout: 30000 }).should('contain', reconfiguredRunName);
};

export const runSingleBenchmarkEvaluationFlow = (
  evaluationTenantProject: string,
  opts: SingleBenchmarkEvaluationOptions,
): void => {
  navigateToEvaluationsPage(evaluationTenantProject);
  submitSingleBenchmarkEvaluation(opts);
  verifyEvaluationProgressModal(opts.evaluationRunName);
  waitForEvaluationJobComplete(evaluationTenantProject);
  verifyEvaluationCompletedAndViewResults(opts.evaluationRunName, evaluationTenantProject);
};
