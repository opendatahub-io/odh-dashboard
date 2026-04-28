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

  findEvaluationsTable() {
    return cy.findByTestId('evaluations-table');
  }
}

export const evaluationsPage = new EvaluationsPage();
