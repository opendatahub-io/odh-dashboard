import { autoragRunResultsPage } from '~/__tests__/cypress/cypress/pages/runResults';

const NAMESPACE = 'my-project';
const SEED_RUN_ID = 'e78c5f2a-5726-4e1c-bcb6-60434e77e453';

const initIntercepts = () => {
  // Connection types come from the host dashboard API, not the autorag BFF.
  cy.intercept({ method: 'GET', pathname: '**/api/connection-types' }, { body: { items: [] } });
};

/**
 * The seed run's optimization_metric is faithfulness, so Answer correctness is not in the
 * default column set. Enable only the Unitxt column so metric-header-answer_correctness is unique.
 */
const enableUnitxtAnswerCorrectnessColumn = (): void => {
  cy.findByTestId('manage-columns-button').click();
  cy.findByTestId('manage-columns-modal').should('be.visible');
  cy.findByTestId('column-check-metric---unitxt---answer_correctness--').then(($control) => {
    const $checkbox = $control.is('input') ? $control : $control.find('input[type="checkbox"]');
    const isChecked =
      $checkbox.prop('checked') === true ||
      $checkbox.attr('aria-checked') === 'true' ||
      $control.attr('aria-checked') === 'true';
    if (!isChecked) {
      cy.wrap($control).click();
    }
  });
  cy.findByTestId('manage-columns-modal').findByRole('button', { name: 'Save' }).click();
  cy.findByTestId('manage-columns-modal').should('not.exist');
};

describe('AutoRAG run results metrics', () => {
  beforeEach(() => {
    initIntercepts();
    autoragRunResultsPage.visit(NAMESPACE, SEED_RUN_ID);
    autoragRunResultsPage.findLeaderboardTable().should('be.visible');
  });

  it('should provide metric header definitions, CI help, and grouped Sample Q&A metrics', () => {
    enableUnitxtAnswerCorrectnessColumn();
    autoragRunResultsPage.findMetricHeader('answer_correctness', 'unitxt').should('be.visible');
    autoragRunResultsPage
      .findMetricHeader('answer_correctness', 'unitxt')
      .findByRole('button', { name: /more info/i })
      .click();
    cy.findByText(/matches the expected ground-truth answers/i).should('be.visible');

    autoragRunResultsPage.findPatternLink(1).click();
    autoragRunResultsPage.findPatternDetailsModal().should('be.visible');

    autoragRunResultsPage.findCIScoresChart().should('be.visible');
    autoragRunResultsPage.findCIScoresInfo().should('be.visible');
    autoragRunResultsPage.findCIMetricHelp('answer_correctness').should('exist');
    cy.findByTestId('ci-legend-low-help').should('exist');

    autoragRunResultsPage.findPatternDetailsTab('sample_qa').click();
    autoragRunResultsPage.findMetricGroup('unitxt').should('be.visible');
    autoragRunResultsPage.findMetricGroup('custom').should('be.visible');
    autoragRunResultsPage.findMetricGroup('unitxt').should('contain.text', 'Answer correctness');
    autoragRunResultsPage.findMetricGroup('custom').should('contain.text', 'Overall score');
  });
});
