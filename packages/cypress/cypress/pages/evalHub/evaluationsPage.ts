const LM_EVAL_DEV_FEATURE_FLAGS = 'devFeatureFlags=disableLMEval=false';

class EvaluationsPage {
  pathWithLmEvalDevFlags(namespace: string): string {
    return `/evaluation/${namespace}?${LM_EVAL_DEV_FEATURE_FLAGS}`;
  }

  findPageTitle() {
    return cy.findByTestId('app-page-title');
  }

  findCreateEvaluationButton() {
    return cy.findByTestId('create-evaluation-button');
  }

  findEvaluationsTable(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('evaluations-table', options);
  }

  findEvaluationStatusButtonInRow(evaluationName: string) {
    return this.findEvaluationsTable()
      .contains('tr', evaluationName)
      .find('[data-testid="evaluation-status-button"]');
  }

  findStatusModal() {
    return cy.findByTestId('evaluation-status-modal');
  }

  findStatusModalProgressTab() {
    return cy.findByTestId('progress-tab');
  }

  findStatusModalEventsLogTab() {
    return cy.findByTestId('events-log-tab');
  }

  findStatusModalProgressContent() {
    return cy.findByTestId('progress-tab-content');
  }

  findStatusModalBenchmarkSteps() {
    return cy.findByTestId('benchmark-steps');
  }

  findStatusModalViewResultsButton() {
    return cy.findByTestId('status-modal-view-results-button');
  }

  findStatusModalStopButton() {
    return cy.findByTestId('status-modal-stop-button');
  }

  findStatusModalCloseButton() {
    return cy.findByTestId('status-modal-close-button');
  }
}

export const evaluationsPage = new EvaluationsPage();
