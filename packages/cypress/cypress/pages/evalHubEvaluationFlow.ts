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

  /** Finds the benchmark card by title in the gallery and clicks "Select benchmark". */
  startRunForBenchmarkCardContaining(displayTitle: string) {
    const cardRoot = '[data-testid^="benchmark-card-"]';
    cy.findByTestId('benchmarks-gallery', { timeout: 30000 })
      .find(cardRoot, { timeout: 30000 })
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

  findSourceModeToggle() {
    return cy.findByTestId('source-mode-toggle');
  }

  findModelPickerToggle() {
    return cy.findByTestId('model-picker-toggle');
  }

  /** Select "Other (External endpoint)" from the model picker dropdown. */
  selectExternalEndpoint() {
    this.findModelPickerToggle().click();
    cy.findByTestId('model-option-external').click();
  }

  /** Select a cluster InferenceService by name from the model picker dropdown. */
  selectClusterModel(name: string) {
    this.findModelPickerToggle().click();
    cy.findByTestId(`model-option-${name}`).click();
  }

  findModelNameInput() {
    return cy.findByTestId('model-name-input');
  }

  findEndpointUrlInput() {
    return cy.findByTestId('endpoint-url-input');
  }

  findValidateConnectionButton() {
    return cy.findByTestId('validate-connection-button');
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
