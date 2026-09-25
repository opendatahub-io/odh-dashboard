class CreateEvaluationPage {
  findStandardisedBenchmarksCard() {
    return cy.findByTestId('standardised-benchmarks-card');
  }

  findSuiteNameInput() {
    return cy.findByTestId('suite-name-input');
  }

  findSuiteDescriptionInput() {
    return cy.findByTestId('suite-description-input');
  }

  findSuiteEvaluatesToggle() {
    return cy.findByTestId('suite-evaluates-toggle');
  }

  findSuiteEvaluatesOption(evaluatesType: string) {
    return cy.findByTestId(`suite-evaluates-option-${evaluatesType}`);
  }

  findCopySuiteNextButton() {
    return cy.findByTestId('copy-suite-next');
  }

  findBenchmarkCatalogSearch() {
    return cy.findByTestId('benchmark-catalog-search').find('input').first();
  }

  findBenchmarkCatalogTable() {
    return cy.findByTestId('benchmark-catalog-table');
  }

  findBenchmarkCatalogCheckboxById(benchmarkId: string, providerId: string) {
    return this.findBenchmarkCatalogTable().find(
      `[data-testid="benchmark-catalog-checkbox-${benchmarkId}"]` +
        `[id="benchmark-catalog-${providerId}:${benchmarkId}"]`,
    );
  }

  findCopySuiteNextSelectBenchmarksButton() {
    return cy.findByTestId('copy-suite-next-select-benchmarks');
  }

  findCopySuiteStepBenchmarks(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('copy-suite-step-benchmarks', options);
  }

  findBenchmarkAdvancedToggle(index: number) {
    return cy
      .findByTestId(`benchmark-advanced-toggle-${index}`)
      .filter(':visible')
      .first()
      .find('button')
      .first();
  }

  findBenchmarkAdditionalParameters(index: number) {
    return cy
      .findByTestId(`benchmark-additional-parameters-${index}`)
      .filter(':visible')
      .first()
      .find('textarea')
      .first();
  }

  findBenchmarkParameterInput(index: number, parameterKey: string) {
    return cy.findByTestId(`benchmark-${index}-parameter-input-${parameterKey}`);
  }

  findCopySuiteSaveOnlyButton() {
    return cy.findByTestId('copy-suite-save-only');
  }

  findCopySuiteSaveAndRunButton(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('copy-suite-save-and-run', options);
  }

  findCreateSuiteSaveAndRunButton(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('create-suite-submit', options);
  }

  findStartEvaluationRunModal(
    modalId = 'evaluations-page-start-evaluation-run-modal',
    options?: Partial<Cypress.Timeoutable>,
  ) {
    return cy.findByTestId(modalId, options);
  }

  findAdvancedConfigurationToggle(modalId?: string) {
    const toggle = modalId
      ? this.findStartEvaluationRunModal(modalId).find(
          '[data-testid="start-evaluation-run-advanced-toggle"]',
        )
      : cy.findByTestId('start-evaluation-run-advanced-toggle');
    return toggle.filter(':visible').first().find('button').first();
  }

  findStartEvaluationRunCollectionName() {
    return cy.findByTestId('start-evaluation-run-collection-name');
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

  findStartEvaluationForm(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('start-evaluation-form', options);
  }

  findBenchmarkNameDisplay() {
    return cy.findByTestId('benchmark-name-display');
  }

  findEvaluationNameInput(modalId?: string) {
    return modalId
      ? this.findStartEvaluationRunModal(modalId).find('[data-testid="evaluation-name-input"]')
      : cy.findByTestId('evaluation-name-input');
  }

  findExperimentModeNew(modalId?: string) {
    return modalId
      ? this.findStartEvaluationRunModal(modalId).find('[data-testid="experiment-mode-new"]')
      : cy.findByTestId('experiment-mode-new');
  }

  findNewExperimentNameInput(modalId?: string) {
    return modalId
      ? this.findStartEvaluationRunModal(modalId).find('[data-testid="new-experiment-name-input"]')
      : cy.findByTestId('new-experiment-name-input');
  }

  findSourceModeToggle() {
    return cy.findByTestId('source-mode-toggle');
  }

  findModelPickerToggle(modalId?: string) {
    const toggle = modalId
      ? this.findStartEvaluationRunModal(modalId).find('[data-testid="model-picker-toggle"]')
      : cy.findByTestId('model-picker-toggle');
    return toggle.filter(':visible').first();
  }

  findModelOption(name: string, modalId?: string) {
    const option = modalId
      ? cy.findByTestId(`model-option-${name}`).filter(':visible').first()
      : cy.findByTestId(`model-option-${name}`);
    return option.find('[role="option"]').first();
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

  findStartEvaluationSubmitButton(modalId?: string) {
    return modalId
      ? this.findStartEvaluationRunModal(modalId).find('[data-testid="start-evaluation-submit"]')
      : cy.findByTestId('start-evaluation-submit');
  }
}

export const createEvaluationPage = new CreateEvaluationPage();
