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

  it('should show the run name as the final breadcrumb item without a page header', () => {
    // Final breadcrumb reflects the run name; no separate page header/subtext.
    // The separator renders as &nbsp; (U+00A0), which contain.text does not
    // normalize — normalize the actual text before comparing.
    autoragRunResultsPage.findResultsBreadcrumbRunName().should(($el) => {
      expect($el.text().replace(/\u00a0/g, ' ')).to.contain('rag results');
    });
    cy.findByTestId('app-page-title').should('not.exist');
  });

  it('should place run actions beside the breadcrumb', () => {
    // The actions share the breadcrumb row — aligned with the run-name
    // breadcrumb and to its right — rather than stacking in a page header.
    autoragRunResultsPage.findResultsBreadcrumbRunName().then(($crumb) => {
      autoragRunResultsPage.findRunDetailsButton().then(($actions) => {
        const crumb = $crumb[0].getBoundingClientRect();
        const actions = $actions[0].getBoundingClientRect();
        expect(actions.top, 'actions row top').to.be.lessThan(crumb.bottom);
        expect(actions.bottom, 'actions row bottom').to.be.greaterThan(crumb.top);
        expect(actions.left, 'actions right of breadcrumb').to.be.greaterThan(crumb.right);
      });
    });

    // At a narrower viewport the actions stay reachable without page-level
    // horizontal overflow.
    cy.viewport(900, 660);
    autoragRunResultsPage.findRunDetailsButton().should('be.visible');
    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth, 'no horizontal overflow').to.be.at.most(
        doc.documentElement.clientWidth,
      );
    });
  });

  it('should toggle the step details panel with the Show/Hide details control', () => {
    cy.findByTestId('hide-details').should('contain.text', 'Hide details');
    cy.findByTestId('close-step-details').click();
    // PF keeps the panel wrapper mounted when collapsed (hidden via transform) — assert the hidden attribute
    cy.findByTestId('step-details-drawer-panel').should('have.attr', 'hidden');
    cy.findByTestId('show-details').should('contain.text', 'Show details');

    cy.findByTestId('show-details').click();
    cy.findByTestId('step-details-drawer-panel').should('be.visible');
    cy.findByTestId('hide-details').should('contain.text', 'Hide details');
  });

  it('should provide metric header definitions, CI help, and grouped Sample Q&A metrics', () => {
    // The seed run optimizes for faithfulness, so enable this column to make its header unique.
    autoragRunResultsPage.enableMetricColumn('answer_correctness', 'unitxt');
    autoragRunResultsPage.findMetricHeader('answer_correctness', 'unitxt').should('be.visible');
    autoragRunResultsPage.findMetricHeaderInfoButton('answer_correctness', 'unitxt').click();
    autoragRunResultsPage
      .findMetricDescriptionPopover()
      .should('contain.text', 'expected ground-truth answers');

    autoragRunResultsPage.findPatternLink(1).click();
    autoragRunResultsPage.findPatternDetailsModal().should('be.visible');

    autoragRunResultsPage.findCIScoresChart().should('be.visible');
    autoragRunResultsPage.findCIScoresInfo().should('be.visible');
    autoragRunResultsPage.findCIMetricHelp('answer_correctness', 'unitxt').should('exist');
    autoragRunResultsPage.findCILegendLowHelp().should('exist');

    autoragRunResultsPage.findPatternDetailsTab('sample_qa').click();
    autoragRunResultsPage.findMetricGroup('unitxt').should('be.visible');
    autoragRunResultsPage.findMetricGroup('custom').should('be.visible');
    autoragRunResultsPage.findMetricGroup('unitxt').should('contain.text', 'Answer correctness');
    autoragRunResultsPage.findMetricGroup('custom').should('contain.text', 'Overall score');
  });
});
