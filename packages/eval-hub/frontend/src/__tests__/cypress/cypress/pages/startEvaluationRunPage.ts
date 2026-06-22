class StartEvaluationRunPage {
  visit(namespace: string, queryParams: string) {
    cy.visit(`/evaluation/${namespace}/create/start?${queryParams}`);
    this.waitForLoad();
  }

  private waitForLoad() {
    cy.findByTestId('start-evaluation-form').should('exist');
    cy.testA11y();
  }

  findForm() {
    return cy.findByTestId('start-evaluation-form');
  }

  findBenchmarkNameDisplay() {
    return cy.findByTestId('benchmark-name-display');
  }

  findEvaluationNameInput() {
    return cy.findByTestId('evaluation-name-input');
  }

  findDescriptionInput() {
    return cy.findByTestId('description-input');
  }

  findExperimentModeExisting() {
    return cy.findByTestId('experiment-mode-existing');
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

  findSourceModeSelect() {
    return cy.findByTestId('source-mode-select');
  }

  findModelPickerToggle() {
    return cy.findByTestId('model-picker-toggle');
  }

  findModelPickerSelect() {
    return cy.findByTestId('model-picker-select');
  }

  findModelNameInput() {
    return cy.findByTestId('model-name-input');
  }

  findAgentNameInput() {
    return cy.findByTestId('agent-name-input');
  }

  findEndpointUrlInput() {
    return cy.findByTestId('endpoint-url-input');
  }

  findApiKeyInput() {
    return cy.findByTestId('api-key-input');
  }

  findSourceNameInput() {
    return cy.findByTestId('source-name-input');
  }

  findDatasetUrlInput() {
    return cy.findByTestId('dataset-url-input');
  }

  findAccessTokenInput() {
    return cy.findByTestId('access-token-input');
  }

  findValidateConnectionButton() {
    return cy.findByTestId('validate-connection-button');
  }

  findBenchmarkThreshold() {
    return cy.findByTestId('benchmark-threshold');
  }

  findPrimaryScorerMetricToggle() {
    return cy.findByTestId('primary-scorer-metric-toggle');
  }

  findShowAdditionalArgsCheckbox() {
    return cy.findByTestId('show-additional-args');
  }

  findAdditionalArgsUpload() {
    return cy.findByTestId('additional-args-upload');
  }

  findSubmitButton() {
    return cy.findByTestId('start-evaluation-submit');
  }

  findCancelButton() {
    return cy.findByTestId('start-evaluation-cancel');
  }

  findLoadError() {
    return cy.findByTestId('start-evaluation-load-error');
  }
}

export const startEvaluationRunPage = new StartEvaluationRunPage();
