/**
 * Live-cluster Eval Hub flow: create evaluation → single benchmark → start run form.
 * Selectors align with `packages/eval-hub/frontend` (see mocked `startEvaluationRunPage` in eval-hub package).
 */
class EvalHubEvaluationFlow {
  openCreateEvaluationFromList() {
    cy.findByTestId('create-evaluation-button').should('be.visible').click();
  }

  selectSingleBenchmarkEntry() {
    cy.findByTestId('standardised-benchmarks-card').should('be.visible').click();
    cy.url().should('include', '/create/benchmarks');
    cy.findByTestId('benchmarks-gallery').should('be.visible', { timeout: 120000 });
  }

  /** Clicks the card footer (or drawer) action to start the run form for a benchmark visible in the gallery. */
  startRunForBenchmarkCardContaining(displayTitle: string) {
    const cardRoot = '[data-testid^="benchmark-card-"]';
    cy.findByTestId('benchmarks-gallery')
      .find(cardRoot)
      .contains('button', displayTitle)
      .parents(cardRoot)
      .first()
      .scrollIntoView();
    cy.findByTestId('benchmarks-gallery')
      .find(cardRoot)
      .contains('button', displayTitle)
      .parents(cardRoot)
      .first()
      .within(() => {
        cy.contains('button', /^(Select benchmark|Use this benchmark)$/).click();
      });
    cy.findByTestId('start-evaluation-form').should('exist', { timeout: 120000 });
  }

  findEvaluationNameInput() {
    return cy.findByTestId('evaluation-name-input');
  }

  findInputModeInference() {
    return cy.findByTestId('input-mode-inference');
  }

  findModelNameInput() {
    return cy.findByTestId('model-name-input');
  }

  findEndpointUrlInput() {
    return cy.findByTestId('endpoint-url-input');
  }

  findApiKeyInput() {
    return cy.findByTestId('api-key-input');
  }

  findBenchmarkParametersCheckbox() {
    return cy.findByTestId('show-additional-args');
  }

  findAdditionalBenchmarkParamsTextarea() {
    return cy.findByTestId('additional-args-upload').find('textarea');
  }

  findStartEvaluationSubmitButton() {
    return cy.findByTestId('start-evaluation-submit');
  }
}

export const evalHubEvaluationFlow = new EvalHubEvaluationFlow();
