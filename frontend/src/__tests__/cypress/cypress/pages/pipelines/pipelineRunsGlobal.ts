import { DeleteModal } from '#~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';

class PipelineRunsGlobal {
  visit(projectName: string, runType?: 'active' | 'archived' | 'scheduled') {
    cy.visitWithLogin(
      `/pipelineRuns/${projectName}${
        runType === 'scheduled' ? '/schedules' : `/runs${runType ? `/${runType}` : ''}`
      }`,
    );
    this.wait();
  }

  navigate() {
    appChrome.findNavItem('Runs', 'Data Science Pipelines').click();
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').contains('Runs');
    cy.testA11y();
  }

  isApiAvailable() {
    return cy.findByTestId('pipelines-api-not-available').should('not.exist');
  }

  findSchedulesTab() {
    return cy.findByTestId('schedules-tab');
  }

  findActiveRunsTab() {
    return cy.findByTestId('active-runs-tab');
  }

  findArchivedRunsTab() {
    return cy.findByTestId('archived-runs-tab');
  }

  findProjectSelect() {
    return cy.findByTestId('project-selector-toggle');
  }

  findCreateRunButton() {
    return cy.findByTestId('create-run-button');
  }

  findScheduleRunButton() {
    return cy.findByTestId('schedule-run-button');
  }

  findRestoreRunButton() {
    return cy.findByTestId('restore-button');
  }

  findActiveRunsToolbar() {
    return cy.findByTestId('active-runs-table-toolbar');
  }

  findArchivedRunsToolbar() {
    return cy.findByTestId('archived-runs-table-toolbar');
  }

  selectFilterByName(name: string) {
    cy.findByTestId('pipeline-filter-dropdown').findDropdownItem(name).click();
  }

  selectProjectByName(name: string) {
    this.findProjectSelect().click();
    cy.findByTestId('project-selector-search').fill(name);
    cy.findByTestId('project-selector-menuList')
      .contains('button', name)
      .should('be.visible')
      .click();
  }
}

class SchedulesDeleteModal extends DeleteModal {
  constructor() {
    super();
  }

  find() {
    return cy.findByTestId('delete-schedule-modal');
  }
}

class RunsDeleteModal extends DeleteModal {
  constructor() {
    super();
  }

  find() {
    return cy.findByTestId('delete-run-modal');
  }
}

export const pipelineRunsGlobal = new PipelineRunsGlobal();
export const schedulesDeleteModal = new SchedulesDeleteModal();
export const runsDeleteModal = new RunsDeleteModal();
