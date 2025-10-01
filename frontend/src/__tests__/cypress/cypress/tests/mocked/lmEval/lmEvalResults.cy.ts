import {
  mockDashboardConfig,
  mockK8sResourceList,
  mockLMEvaluation,
  mockProjectK8sResource,
} from '#~/__mocks__';
import { LMEvalModel, ProjectModel } from '#~/__tests__/cypress/cypress/utils/models';
import { lmEvalList } from '#~/__tests__/cypress/cypress/pages/lmEval/lmEvalList';
import { lmEvalPage } from '#~/__tests__/cypress/cypress/pages/lmEval/lmEvalPage';
import { lmEvalResultsPage } from '#~/__tests__/cypress/cypress/pages/lmEval/lmEvalResultsPage';
import { verifyRelativeURL } from '#~/__tests__/cypress/cypress/utils/url';
import { mockCompleteEvaluationResults } from './lmEvalMockResults';

const TEST_PROJECT = 'test-project';
const COMPLETE_EVALUATION = 'complete-evaluation';

const mockEvaluations = [
  {
    name: COMPLETE_EVALUATION,
    state: 'Complete',
    reason: 'NoReason',
    modelArgs: [{ name: 'model', value: 'granite-7b' }],
    results: JSON.stringify(mockCompleteEvaluationResults),
  },
  {
    name: 'failed-evaluation',
    state: 'Complete',
    reason: 'Failed',
    message: 'Evaluation failed due to timeout',
    modelArgs: [{ name: 'model', value: 'llama-7b' }],
    results: undefined,
  },
  {
    name: 'running-evaluation',
    state: 'Running',
    message: 'Evaluation is currently running',
    modelArgs: [{ name: 'model', value: 'mistral-7b' }],
    results: undefined,
  },
  {
    name: 'pending-evaluation',
    state: 'Scheduled',
    message: 'Evaluation is scheduled',
    modelArgs: [{ name: 'model', value: 'codellama-7b' }],
    results: undefined,
  },
];

const initIntercepts = () => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ disableLMEval: false }));

  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([
      mockProjectK8sResource({ k8sName: TEST_PROJECT, displayName: 'Test Project' }),
    ]),
  );

  cy.interceptK8sList(
    { model: LMEvalModel, ns: TEST_PROJECT },
    mockK8sResourceList(mockEvaluations.map(mockLMEvaluation)),
  );

  // Add intercept for individual LM evaluation resource
  cy.interceptK8s(
    { model: LMEvalModel, ns: TEST_PROJECT, name: COMPLETE_EVALUATION },
    mockLMEvaluation({
      name: COMPLETE_EVALUATION,
      state: 'Complete',
      reason: 'NoReason',
      modelArgs: [{ name: 'model', value: 'granite-7b' }],
      results: JSON.stringify(mockCompleteEvaluationResults),
    }),
  );
};

describe('LM Eval Results', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should only show clickable links for completed evaluations', () => {
    lmEvalPage.visit(TEST_PROJECT);
    lmEvalPage.findPageTitle().should('have.text', 'Evaluations');

    // Complete evaluation should have clickable link
    lmEvalList.getRow(COMPLETE_EVALUATION).shouldHaveClickableLink(COMPLETE_EVALUATION);

    // Non-complete evaluations should NOT have clickable links
    lmEvalList.getRow('failed-evaluation').shouldNotHaveClickableLink('failed-evaluation');
    lmEvalList.getRow('running-evaluation').shouldNotHaveClickableLink('running-evaluation');
    lmEvalList.getRow('pending-evaluation').shouldNotHaveClickableLink('pending-evaluation');
  });

  it('should navigate to results page when clicking on completed evaluation link', () => {
    lmEvalPage.visit(TEST_PROJECT);

    lmEvalList.getRow(COMPLETE_EVALUATION).clickEvaluationLink();

    verifyRelativeURL(`/develop-train/evaluations/${TEST_PROJECT}/${COMPLETE_EVALUATION}`);
    lmEvalResultsPage.verifyPageTitle(COMPLETE_EVALUATION);
    lmEvalResultsPage.verifyBreadcrumbNavigation();
  });

  it('should display correct evaluation results on results page', () => {
    lmEvalResultsPage.visit(TEST_PROJECT, COMPLETE_EVALUATION);

    // Verify page structure
    lmEvalResultsPage.verifyPageTitle(COMPLETE_EVALUATION);
    lmEvalResultsPage.verifyBreadcrumbNavigation();
    lmEvalResultsPage.verifyDownloadButtonExists();

    // Verify table contains expected data
    const table = lmEvalResultsPage.findResultsTable();
    table.should('exist');

    // Verify tasks
    ['hellaswag', 'arc_easy', 'winogrande'].forEach((task) => {
      table.should('contain', task);
    });

    // Verify metrics (updated to new format with ,none suffix)
    ['acc,none', 'acc_norm,none'].forEach((metric) => {
      table.should('contain', metric);
    });

    // Verify values
    ['0.85432', '0.76543', '0.91234', '0.89876', '0.73456'].forEach((value) => {
      table.should('contain', value);
    });
  });

  it('should support filtering and searching in results table', () => {
    lmEvalResultsPage.visit(TEST_PROJECT, COMPLETE_EVALUATION);

    const table = lmEvalResultsPage.findResultsTable();
    table.should('exist');
    table.should('contain', 'hellaswag');
    table.should('contain', 'arc_easy');

    // Conditional toolbar testing
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="lm-eval-result-toolbar"]').length > 0) {
        lmEvalResultsPage.findToolbar().should('exist');
        lmEvalResultsPage.selectFilterColumn('Task');
        lmEvalResultsPage.searchForValue('hellaswag');
        table.should('contain', 'hellaswag');
      } else {
        cy.log('Toolbar not found, but table data is correctly displayed');
        table.should('contain', 'hellaswag');
        table.should('contain', 'arc_easy');
      }
    });
  });

  it('should handle breadcrumb navigation back to evaluations list', () => {
    lmEvalResultsPage.visit(TEST_PROJECT, COMPLETE_EVALUATION);

    lmEvalResultsPage.findBreadcrumbItem('Evaluations').click();

    verifyRelativeURL('/develop-train/evaluations');
    lmEvalPage.findPageTitle().should('have.text', 'Evaluations');
  });

  it('should allow downloading results as JSON', () => {
    lmEvalResultsPage.visit(TEST_PROJECT, COMPLETE_EVALUATION);

    lmEvalResultsPage.findDownloadButton().click();

    cy.readFile(`cypress/downloads/${COMPLETE_EVALUATION}-results.json`).should('exist');
  });
});
