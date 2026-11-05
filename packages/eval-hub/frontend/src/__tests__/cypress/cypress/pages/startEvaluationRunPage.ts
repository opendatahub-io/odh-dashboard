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

  findTestDataRefSourceToggle() {
    return cy.findByTestId('start-evaluation-test-data-ref-source-toggle');
  }

  findTestDataRefOption(optionLabel: string) {
    return cy.findByRole('option', { name: optionLabel });
  }

  findTestDataRefField(field: string) {
    return cy.findByTestId(`start-evaluation-test-data-ref-${field}`);
  }

  findTestDataRefFieldError(field: string) {
    return cy.findByTestId(`start-evaluation-test-data-ref-${field}-error`);
  }

  findBenchmarkNameDisplay() {
    return cy.findByTestId('benchmark-name-display');
  }

  findRunDescription() {
    return cy.findByTestId('start-evaluation-run-description');
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

  findModelPickerToggle() {
    return cy.findByTestId('model-picker-toggle');
  }

  findModelPickerSelect() {
    return cy.findByTestId('model-picker-select');
  }

  findExternalModelOption() {
    return cy.findByTestId('model-option-external');
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

  findValidateConnectionButton() {
    return cy.findByTestId('validate-connection-button');
  }

  findBenchmarkThreshold() {
    return cy.findByTestId('benchmark-threshold');
  }

  findPrimaryScorerMetricToggle() {
    return cy.findByTestId('primary-scorer-metric-toggle');
  }

  findPrimaryScorerMetricOption(metric: string) {
    return cy.findByTestId(`primary-scorer-metric-option-${metric}`);
  }

  findShowAdditionalArgsCheckbox() {
    return cy.findByTestId('show-additional-args');
  }

  findAdditionalArgsUpload() {
    return cy.findByTestId('additional-args-upload');
  }

  findHardwareProfileToggle() {
    return cy.findByTestId('hardware-profile-toggle');
  }

  findHardwareProfileOption(profileName: string) {
    return cy.findByTestId(`hardware-profile-option-${profileName}`);
  }

  findHardwareProfileHelperText() {
    return cy.findByTestId('hardware-profile-helper-text');
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

  findNotificationTitle(title: string) {
    return cy.findByTestId('toast-notification-alert').findByText(title);
  }

  findNotificationMessage(message: string | RegExp) {
    return cy.findByTestId('toast-notification-alert').findByText(message);
  }
}

export const startEvaluationRunPage = new StartEvaluationRunPage();
