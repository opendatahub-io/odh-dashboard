import { autoragRunResultsPage } from '~/__tests__/cypress/cypress/pages/runResults';

const NAMESPACE = 'my-project';
const SEED_RUN_ID = 'e78c5f2a-5726-4e1c-bcb6-60434e77e453';

const initIntercepts = () => {
  // Connection types come from the host dashboard API, not the autorag BFF.
  cy.intercept({ method: 'GET', pathname: '**/api/connection-types' }, { body: { items: [] } });
};

describe('AutoRAG run results metrics', () => {
  beforeEach(() => {
    initIntercepts();
    autoragRunResultsPage.visit(NAMESPACE, SEED_RUN_ID);
    autoragRunResultsPage.findLeaderboardTable().should('be.visible');
  });

  it('should provide metric header definitions, CI help, and grouped Sample Q&A metrics', () => {
    // The seed run optimizes for faithfulness, so enable this column to make its header unique.
    autoragRunResultsPage.enableMetricColumn('answer_correctness', 'unitxt');
    autoragRunResultsPage.findMetricHeader('answer_correctness', 'unitxt').should('be.visible');
    autoragRunResultsPage.findMetricHeaderInfoButton('answer_correctness', 'unitxt').click();
    autoragRunResultsPage
      .findMetricDescriptionTooltip()
      .should('contain.text', 'Matches the expected ground-truth answers');

    autoragRunResultsPage.findPatternLink(1).click();
    autoragRunResultsPage.findPatternDetailsModal().should('be.visible');

    autoragRunResultsPage.findCIScoresChart().should('be.visible');
    autoragRunResultsPage.findCIScoresInfo().should('be.visible');
    autoragRunResultsPage.findCIMetricHelp('answer_correctness').should('exist');
    autoragRunResultsPage.findCILegendLowHelp().should('exist');

    autoragRunResultsPage.findPatternDetailsTab('sample_qa').click();
    autoragRunResultsPage.findMetricGroup('unitxt').should('be.visible');
    autoragRunResultsPage.findMetricGroup('custom').should('be.visible');
    autoragRunResultsPage.findMetricGroup('unitxt').should('contain.text', 'Answer correctness');
    autoragRunResultsPage.findMetricGroup('custom').should('contain.text', 'Overall score');
  });
});
