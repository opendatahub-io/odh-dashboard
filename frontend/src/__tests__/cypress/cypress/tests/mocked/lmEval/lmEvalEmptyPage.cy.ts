import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { ProjectModel } from '#~/__tests__/cypress/cypress/utils/models';
import { LMEvalModel } from '#~/api/models';
import { verifyRelativeURL } from '#~/__tests__/cypress/cypress/utils/url';
import { lmEvalPage } from '#~/__tests__/cypress/cypress/pages/lmEval/lmEvalPage';
import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig.ts';

describe('LM Evaluation Home Page', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should show empty state when no evaluations exist', () => {
    lmEvalPage.visit('test-project');

    lmEvalPage.findPageTitle().should('have.text', 'Evaluations');
    lmEvalPage.findEmptyStateTitle().should('contain.text', 'No model evaluation runs');
    lmEvalPage
      .findEmptyStateBody()
      .should(
        'contain.text',
        'No evaluation runs have been started for models in this project. Start a new evaluation run, or select a different project.',
      );

    lmEvalPage.findEvaluateModelButton().should('exist');
  });

  it('should show empty state when no projects exist', () => {
    cy.interceptK8sList(ProjectModel, mockK8sResourceList([]));
    lmEvalPage.visit();

    lmEvalPage.findEmptyStateTitle().should('contain.text', 'No projects');
    lmEvalPage
      .findEmptyStateBody()
      .should('contain.text', 'To view model evaluations, first create a project.');

    // Verify Create project button exists
    lmEvalPage.findCreateProjectButton().should('exist');
  });

  it('should verify model evaluation is invisible when feature flag is disabled', () => {
    // Mock feature flag disabled
    initIntercepts(true);

    // Visit the LM Evaluation page
    lmEvalPage.visit(undefined, false);

    // Verify feature is disabled
    lmEvalPage.findPageTitle().should('not.exist');
  });

  it('should verify URL for model evaluation form', () => {
    // Mock project and empty evaluations
    cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
    cy.interceptK8sList(LMEvalModel, mockK8sResourceList([]));

    // Visit the LM Evaluation page
    lmEvalPage.visit('test-project');

    // Verify URL
    verifyRelativeURL('/develop-train/evaluations/test-project');

    // Click Evaluate model button
    lmEvalPage.findEvaluateModelButton().click();

    // Verify URL changes to evaluate page
    verifyRelativeURL('/develop-train/evaluations/test-project/evaluate');
  });
});

const initIntercepts = (disableLMEval = false): void => {
  // Mock dashboard config
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableLMEval,
    }),
  );
  cy.interceptK8sList(LMEvalModel, mockK8sResourceList([]));
  // Mock projects list
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([
      mockProjectK8sResource({
        k8sName: 'test-project',
        displayName: 'Test Project',
      }),
    ]),
  );

  cy.interceptK8sList(LMEvalModel, mockK8sResourceList([]));
};
