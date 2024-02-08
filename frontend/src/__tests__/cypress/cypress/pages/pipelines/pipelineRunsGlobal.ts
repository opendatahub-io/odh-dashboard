import { DeleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';

class PipelineRunsGlobal {
  visit(projectName: string, runType?: 'scheduled' | 'triggered') {
    cy.visitWithLogin(`/pipelineRuns/${projectName}${runType ? `?runType=${runType}` : ''}`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').contains('Runs');
    cy.testA11y();
  }

  isApiAvailable() {
    return cy.findByTestId('pipelines-api-not-available').should('not.exist');
  }

  findScheduledTab() {
    return cy.findByRole('tab', { name: 'Scheduled runs tab' });
  }

  findTriggeredTab() {
    return cy.findByRole('tab', { name: 'Triggered runs tab' });
  }

  findProjectSelect() {
    return cy.findByTestId('project-selector-dropdown');
  }

  findCreateRunButton() {
    return cy.findByRole('button', { name: 'Create run' });
  }

  selectFilterByName(name: string) {
    cy.findByTestId('pipeline-filter-dropdown').findDropdownItem(name).click();
  }

  selectProjectByName(name: string) {
    this.findProjectSelect().findDropdownItem(name).click();
  }
}

class ScheduledRunDeleteModal extends DeleteModal {
  constructor(multiple = false) {
    super(`Warning alert: Delete ${multiple ? '2 ' : ''}scheduled run${multiple ? 's' : ''}?`);
  }
}

class TriggeredRunDeleteModal extends DeleteModal {
  constructor(multiple = false) {
    super(`Warning alert: Delete ${multiple ? '2 ' : ''}triggered run${multiple ? 's' : ''}?`);
  }
}

export const pipelineRunsGlobal = new PipelineRunsGlobal();
export const scheduledRunDeleteModal = new ScheduledRunDeleteModal();
export const triggeredRunDeleteModal = new TriggeredRunDeleteModal();
export const scheduledRunDeleteMultipleModal = new ScheduledRunDeleteModal(true);
export const triggeredRunDeleteMultipleModal = new TriggeredRunDeleteModal(true);
