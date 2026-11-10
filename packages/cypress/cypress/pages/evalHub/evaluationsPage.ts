class EvaluationsPage {
  pathWithLmEvalDevFlags(namespace: string): string {
    return `/evaluation/${namespace}?devFeatureFlags=disableLMEval=false`;
  }

  findPageTitle(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('app-page-title', options);
  }

  findCreateEvaluationButton(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('create-evaluation-button', options);
  }

  findEvaluateTab(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('evaluate-tab', options);
  }

  findEvaluateTabContent(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('evaluate-tab-content', options);
  }

  findBrowseAllBenchmarksExplore(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('browse-all-benchmarks-explore', options);
  }

  findBenchmarkSuitesGallery(options?: Partial<Cypress.Timeoutable>) {
    // Scope to the Evaluate tab content — mountOnEnter keeps the Gallery tab's gallery in the
    // DOM with the same test ID, so an unscoped query matches both galleries.
    return this.findEvaluateTabContent(options).findByTestId('benchmark-suites-gallery', options);
  }

  findCreateSuiteButton(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('create-suite-button', options);
  }

  findBenchmarkSuiteCardByName(suiteName: string, options?: Partial<Cypress.Timeoutable>) {
    // Derive the collection ID from the name element's test ID and resolve the card root exactly.
    // A prefix-matching .parents() query would match nearer ancestors first — the clickable title
    // region (benchmark-suite-card-title-region-<id>) sits between the name and the card root.
    return this.findBenchmarkSuitesGallery(options)
      .contains('[data-testid^="benchmark-suite-card-name-"]', suiteName, options)
      .then(($name) => {
        const collectionId = ($name.attr('data-testid') ?? '').replace(
          'benchmark-suite-card-name-',
          '',
        );
        return cy.wrap(
          $name.closest(`[data-testid="benchmark-suite-card-${collectionId}"]`),
          options,
        );
      });
  }

  findBenchmarkSuitePrimaryActionByName(suiteName: string, options?: Partial<Cypress.Timeoutable>) {
    return this.findBenchmarkSuiteCardByName(suiteName, options).find(
      '[data-testid^="benchmark-suite-card-primary-action-"]',
      options,
    );
  }

  findEvaluationsTable(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('evaluations-table', options);
  }

  findEvaluationStatusButtonInRow(evaluationName: string, options?: Partial<Cypress.Timeoutable>) {
    return this.findEvaluationsTable(options)
      .find('td[data-testid="evaluation-name"]', options)
      .filter((_, element) => element.textContent.trim() === evaluationName)
      .first()
      .closest('tr')
      .find('[data-testid="evaluation-status-button"]', options);
  }

  findStatusModal(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('evaluation-status-modal', options);
  }

  findStatusModalProgressTab(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('progress-tab', options);
  }

  findStatusModalEventsLogTab(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('events-log-tab', options);
  }

  findStatusModalProgressContent(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('progress-tab-content', options);
  }

  findStatusModalBenchmarkSteps() {
    return cy.findByTestId('benchmark-steps');
  }

  findStatusModalViewResultsButton(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('status-modal-view-results-button', options);
  }

  findStatusModalStopButton(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('status-modal-stop-button', options);
  }

  findStatusModalReconfigureButton(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('status-modal-reconfigure-button', options);
  }

  findStatusModalCloseButton(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('status-modal-close-button', options);
  }

  findRunsTabContent(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('runs-tab-content', options);
  }

  findStopModal(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('evaluation-stop-modal', options);
  }

  findStopConfirmButton(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('evaluation-stop-confirm', options);
  }

  findStopCancelButton() {
    return cy.findByTestId('evaluation-stop-cancel');
  }
}

export const evaluationsPage = new EvaluationsPage();
