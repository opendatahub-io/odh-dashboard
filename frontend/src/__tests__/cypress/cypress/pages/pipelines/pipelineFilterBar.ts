import type { ExperimentKFv2 } from '~/concepts/pipelines/kfTypes';

class PipelineFilterBar {
  find() {
    return cy.findByTestId('pipeline-filter-toolbar');
  }
}

class PipelineRunFilterBar extends PipelineFilterBar {
  findNameInput() {
    return cy.findByTestId('search-for-run-name');
  }

  findExperimentInput() {
    return cy.findByTestId('pipeline-filter-text-field').find('#experiment-search-input');
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
  }

  selectPipelineVersionByName(name: string): void {
    this.findPipelineVersionSelect()
      .click()
      .parents()
      .findByTestId('pipeline-version-selector-table-list')
      .find('td')
      .contains(name)
      .click();
  }

  selectExperimentByName(name: string) {
    cy.findByTestId('experiment-search-select').findSelectOption(name).click();
  }

  mockExperiments(experiments: ExperimentKFv2[], namespace: string) {
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
