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

  /** Switches the filter toolbar to "Name" and types the search term to narrow the gallery. */
  searchBenchmarkByName(name: string) {
    cy.findByTestId('filter-toolbar-dropdown').click();
    cy.findByTestId('filter-toolbar-option-Name').click();
    cy.findByTestId('benchmarks-name-filter').clear();
    cy.findByTestId('benchmarks-name-filter').type(name);
  }

  /** Searches for the benchmark by name, then clicks "Select benchmark" on the matching card. */
  startRunForBenchmarkCardContaining(displayTitle: string) {
    this.searchBenchmarkByName(displayTitle);

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
        cy.findByTestId('select-benchmark-button').click();
      });
    cy.findByTestId('start-evaluation-form').should('exist', { timeout: 120000 });
  }

  findBenchmarkNameDisplay() {
    return cy.findByTestId('benchmark-name-display');
  }

  findEvaluationNameInput() {
    return cy.findByTestId('evaluation-name-input');
  }

  findExperimentModeNew() {
    return cy.findByTestId('experiment-mode-new');
  }

  findNewExperimentNameInput() {
    return cy.findByTestId('new-experiment-name-input');
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
