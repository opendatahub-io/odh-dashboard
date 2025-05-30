import type { ExperimentKF } from '#~/concepts/pipelines/kfTypes';

class PipelineFilterBar {
  find() {
    return cy.findByTestId('pipeline-filter-toolbar');
  }
}

class PipelineRunFilterBar extends PipelineFilterBar {
  findNameInput() {
    return cy.findByTestId('search-for-run-name');
  }

  findExperimentSelect() {
    return cy.findByTestId('experiment-toggle-button');
  }

  findPipelineVersionSelect() {
    return cy.findByTestId('pipeline-version-toggle-button');
  }

  findStartDateInput() {
    return cy.findByTestId('data-picker').find('input');
  }

  findStatusSelect() {
    return cy.findByTestId('runtime-status-dropdown');
  }

  findSortButtonForActive(name: string) {
    return this.findActiveRunsTable().find('thead').findByRole('button', { name });
  }

  private findActiveRunsTable() {
    return cy.findByTestId('active-runs-table');
  }

  findSortButtonForArchive(name: string) {
    return this.findArchiveRunsTable().find('thead').findByRole('button', { name });
  }

  private findArchiveRunsTable() {
    return cy.findByTestId('archived-runs-table');
  }

  findSortButtonforSchedules(name: string) {
    return this.findSchedulesTable().find('thead').findByRole('button', { name });
  }

  private findSchedulesTable() {
    return cy.findByTestId('schedules-table');
  }

  selectStatusByName(name: string) {
    this.findStatusSelect().findSelectOption(name).click();
    return this;
  }

  selectPipelineVersionByName(name: string) {
    this.findPipelineVersionSelect().click();
    cy.findByTestId('pipeline-version-selector-table-list').find('td').contains(name).click();
    return this;
  }

  selectExperimentByName(name: string) {
    this.findExperimentSelect().click();
    cy.findByTestId('experiment-selector-table-list').find('td').contains(name).click();
    return this;
  }

  mockExperiments(experiments: ExperimentKF[], namespace: string) {
    return cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/experiments',
      {
        path: { namespace, serviceName: 'dspa' },
      },
      {
        experiments,
      },
    );
  }
}

export const pipelineRunFilterBar = new PipelineRunFilterBar();
