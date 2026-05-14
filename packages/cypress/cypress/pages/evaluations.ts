import { pollUntilSuccess } from '../utils/oc_commands/baseCommands';

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

  /** Waits for the LMEvalJob to reach Complete on the backend, then verifies the UI. */
  assertEvaluationComplete(evaluationName: string, namespace: string, timeoutMs = 900000) {
    const pollIntervalMs = 10000;
    const maxAttempts = Math.ceil(timeoutMs / pollIntervalMs);

    pollUntilSuccess(
      `oc get lmevaljobs -n ${namespace} -o json | jq -e '.items[] | select(.metadata.name | contains("${evaluationName}")) | select(.status.state == "Complete")'`,
      `LMEvalJob ${evaluationName} Complete`,
      { maxAttempts, pollIntervalMs },
    );

    cy.reload();
    this.findPageTitle().should('be.visible', { timeout: 30000 });
    this.findEvaluationsTable({ timeout: 30000 })
      .contains('tr', evaluationName, { timeout: 30000 })
      .find('[data-testid="status-label-completed"]')
      .should('exist');
  }
}

export const evaluationsPage = new EvaluationsPage();
