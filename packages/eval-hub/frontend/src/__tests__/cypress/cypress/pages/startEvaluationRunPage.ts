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

  findInputModeInference() {
    return cy.findByTestId('input-mode-inference');
  }

  findInputModePrerecorded() {
    return cy.findByTestId('input-mode-prerecorded');
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

  findSourceNameInput() {
    return cy.findByTestId('source-name-input');
  }

  findDatasetUrlInput() {
    return cy.findByTestId('dataset-url-input');
  }

  findAccessTokenInput() {
    return cy.findByTestId('access-token-input');
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
