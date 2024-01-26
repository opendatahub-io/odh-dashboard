import { TableRow } from '~/__tests__/cypress/cypress/pages/components/table';
import { DeleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';

class PipelineRunsGlobal {
  visit(namespace: string) {
    cy.visitWithLogin(`/pipelineRuns/${namespace}`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').contains('Runs');
    cy.testA11y();
  }

  findIsApiAvailable() {
    return cy.findByTestId('pipelines-api-available');
  }

  findRunsTable() {
    return cy.findByTestId('pipeline-run-table');
  }

  findJobsTable() {
    return cy.findByTestId('pipeline-run-job-table');
  }

  findRunTableEmpty() {
    return cy.findByTestId('create-run-empty-state');
  }

  getPipelineRunsTableRow(name: string) {
    return new PipelineRunsTableRow(() =>
      this.findRunsTable().find('[data-label=Name]').contains(name).parents('tr'),
    );
  }
  getPipelineRunJobsTableRow(name: string) {
    return new PipelineRunsTableRow(() =>
      this.findJobsTable().find('[data-label=Name]').contains(name).parents('tr'),
    );
  }

  findScheduledRunTab() {
    return cy.findByTestId('scheduled-runs-tab');
  }

  findTriggeredRunsTab() {
    return cy.findByTestId('triggered-runs-tab');
  }

  findRunTableActionsKebab() {
    return cy.findByTestId('run-table-toolbar-item').findByTestId('run-table-toolbar-actions');
  }
  findJobTableActionsKebab() {
    return cy.findByTestId('job-table-toolbar-item').findByTestId('run-table-toolbar-actions');
  }
}

class PipelineRunsTableRow extends TableRow {}

class ScheduledRunDeleteModal extends DeleteModal {
  constructor(multiple = false) {
    super(
      'Warning alert: Delete ' +
        (multiple ? '2 ' : '') +
        'scheduled run' +
        (multiple ? 's' : '') +
        '?',
    );
  }
}

class TriggeredRunDeleteModal extends DeleteModal {
  constructor(multiple = false) {
    super(
      'Warning alert: Delete ' +
        (multiple ? '2 ' : '') +
        'triggered run' +
        (multiple ? 's' : '') +
        '?',
    );
  }
}

export const globalPipelineRuns = new PipelineRunsGlobal();
export const scheduledRunDeleteModal = new ScheduledRunDeleteModal();
export const triggeredRunDeleteModal = new TriggeredRunDeleteModal();
export const scheduledRunDeleteMultipleModal = new ScheduledRunDeleteModal(true);
export const triggeredRunDeleteMultipleModal = new TriggeredRunDeleteModal(true);
