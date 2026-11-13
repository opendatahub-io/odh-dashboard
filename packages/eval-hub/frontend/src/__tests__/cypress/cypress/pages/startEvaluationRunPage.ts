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

  findActiveBreadcrumb() {
    return cy.findByTestId('start-evaluation-breadcrumb-active');
  }

  findAdvancedConfigurationToggle() {
    return cy.findByTestId('start-evaluation-run-advanced-toggle').find('button').first();
  }

  findBenchmarkSettingsHeading() {
    return cy.findByTestId('benchmark-settings-heading');
  }

  findEvaluationRunDetailsHeading() {
    return cy.findByTestId('evaluation-run-details-heading');
  }

  findTestDataSourceHeading() {
    return cy.findByTestId('start-evaluation-test-data-ref-heading');
  }

  findAdvancedBenchmarkParametersToggle() {
    return cy
      .findByTestId('start-evaluation-run-advanced-benchmark-parameters-toggle')
      .find('button')
      .first();
  }

  findAdvancedBenchmarkParametersContent() {
    return cy.findByTestId('start-evaluation-run-advanced-benchmark-parameters-content');
  }

  findBenchmarkParameterInput(parameterKey: string) {
    return cy.findByTestId(`single-benchmark-parameter-input-${parameterKey}`);
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
    return cy.get(
      '[data-testid="benchmark-name-display"], [data-testid="start-evaluation-run-benchmark-name"]',
    );
  }

  findRunDescription() {
    return cy.findByTestId('start-evaluation-run-description');
  }

  findRunPrerequisite() {
    return cy.findByTestId('start-evaluation-run-prerequisite');
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

  findBenchmarkThresholdInput() {
    return cy.get(
      '[data-testid="benchmark-threshold"] input[type="number"], input[data-testid="benchmark-threshold"]',
    );
  }

  findPrimaryScorerMetricToggle() {
    return cy.findByTestId('primary-scorer-metric-toggle');
  }

  findPrimaryScorerMetricOption(metric: string) {
    return cy.findByTestId(`primary-scorer-metric-option-${metric}`);
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
