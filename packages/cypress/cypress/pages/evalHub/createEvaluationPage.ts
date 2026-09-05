class CreateEvaluationPage {
  findStandardisedBenchmarksCard() {
    return cy.findByTestId('standardised-benchmarks-card');
  }

  findEvaluationCollectionsCard() {
    return cy.findByTestId('evaluation-collections-card');
  }

  findCollectionsGallery(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('collections-gallery', options);
  }

  findCollectionCard(collectionId: string) {
    return cy.findByTestId(`collection-card-${collectionId}`);
  }

  findUseBenchmarkSuiteButton() {
    return cy.findByTestId('use-benchmark-suite-button');
  }

  findCollectionsNameFilter() {
    return cy.findByTestId('collections-name-filter');
  }

  findBenchmarksGallery(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('benchmarks-gallery', options);
  }

  findBenchmarkCardByTitle(displayTitle: string) {
    const cardRoot = '[data-testid^="benchmark-card-"]';
    return this.findBenchmarksGallery({ timeout: 30000 })
      .find(cardRoot, { timeout: 30000 })
      .contains('button', displayTitle)
      .parents(cardRoot)
      .first();
  }

  findSelectBenchmarkButton() {
    return cy.findByTestId('select-benchmark-button');
  }

  findStartEvaluationForm() {
    return cy.findByTestId('start-evaluation-form');
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

  findModelOption(name: string) {
    return cy.findByTestId(`model-option-${name}`);
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

export const createEvaluationPage = new CreateEvaluationPage();
