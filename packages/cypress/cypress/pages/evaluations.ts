/**
 * Evaluations (Eval Hub) area — selectors and URL helpers for live-cluster E2E.
 * LM eval is gated by `disableLMEval` on OdhDashboardConfig; dev sessions override via query (see `useDevFeatureFlags`).
 */
const LM_EVAL_DEV_FEATURE_FLAGS = 'devFeatureFlags=disableLMEval=false';

class EvaluationsPage {
  /** Path + query for `/evaluation/:ns` with LM eval enabled for the session. */
  pathWithLmEvalDevFlags(namespace: string): string {
    return `/evaluation/${namespace}?${LM_EVAL_DEV_FEATURE_FLAGS}`;
  }

  findPageTitle() {
    return cy.findByTestId('app-page-title');
  }

  findCreateEvaluationButton() {
    return cy.findByTestId('create-evaluation-button');
  }

  assertEvaluationsShellVisible(namespace: string) {
    cy.url().should('include', `/evaluation/${namespace}`);
    this.findPageTitle().should('be.visible').and('contain.text', 'Evaluations');
    this.findCreateEvaluationButton().should('be.visible');
  }

  assertEvaluationsTableContains(evaluationName: string) {
    this.findEvaluationsTable().should('be.visible', { timeout: 120000 });
    this.findEvaluationsTable().should('contain', evaluationName);
  }

  findEvaluationsTable(options?: Partial<Cypress.Timeoutable>) {
    return cy.findByTestId('evaluations-table', options);
  }

  /** Reloads the page and asserts the evaluation row shows a completed status. */
  assertEvaluationCompleteInUI(evaluationName: string) {
    cy.reload();
    this.findPageTitle().should('be.visible', { timeout: 30000 });
    this.findEvaluationsTable({ timeout: 30000 })
      .contains('tr', evaluationName, { timeout: 30000 })
      .find('[data-testid="status-label-completed"]')
      .should('exist');
  }
}

export const evaluationsPage = new EvaluationsPage();
