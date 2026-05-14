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

  /** Waits for the evaluation row to reach "Complete" status (polls via reload). */
  assertEvaluationComplete(evaluationName: string, timeoutMs = 900000) {
    const pollIntervalMs = 10000;
    const maxAttempts = Math.ceil(timeoutMs / pollIntervalMs);

    const checkStatus = (attempt: number): void => {
      this.findEvaluationsTable({ timeout: 30000 })
        .contains('tr', evaluationName, { timeout: 30000 })
        .then(($row) => {
          const hasComplete = $row.find('[data-testid="status-label-completed"]').length > 0;
          const hasFailed = $row.find('[data-testid="status-label-failed"]').length > 0;

          if (hasComplete) {
            const elapsedSeconds = (attempt * pollIntervalMs) / 1000;
            cy.log(`Evaluation "${evaluationName}" completed after ${elapsedSeconds}s`);
            return;
          }
          if (hasFailed) {
            throw new Error(`Evaluation "${evaluationName}" failed`);
          }
          if (attempt >= maxAttempts) {
            throw new Error(
              `Evaluation "${evaluationName}" did not complete within ${timeoutMs / 1000}s`,
            );
          }

          // eslint-disable-next-line cypress/no-unnecessary-waiting
          cy.wait(pollIntervalMs);
          cy.reload();
          this.findPageTitle().should('be.visible', { timeout: 30000 });
          checkStatus(attempt + 1);
        });
    };

    checkStatus(0);
  }
}

export const evaluationsPage = new EvaluationsPage();
