import { ExperimentKFv2 } from '~/concepts/pipelines/kfTypes';

class PipelineFilterBar {
  find() {
    return cy.findByTestId('pipeline-filter-toolbar');
  }
}

class PipelineRunFilterBar extends PipelineFilterBar {
  findNameInput() {
    return cy.findByLabelText('Search for a triggered run name');
  }

  findExperimentInput() {
    return cy.get('#experiment-search-input');
  }

  findPipelineVersionSelect() {
    return cy.findByTestId('pipeline-version-toggle-button');
  }

  findStartDateInput() {
    return cy.findByLabelText('Select a start date');
  }

  findStatusSelect() {
    return cy.findByTestId('runtime-status-dropdown');
  }

  selectStatusByName(name: string) {
    this.findStatusSelect().findDropdownItem(name).click();
  }

  selectPipelineVersionByName(name: string): void {
    this.findPipelineVersionSelect()
      .click()
      .get('[data-id="pipeline-version-selector-table-list"]')
      .findByText(name)
      .click();
  }

  selectExperimentByName(name: string) {
    cy.findByTestId('experiment-search-select').findSelectOption(name).click();
  }

  mockExperiments(experiments: ExperimentKFv2[]) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: '/api/proxy/apis/v2beta1/experiments',
      },
      {
        experiments,
      },
    );
  }
}

export const pipelineRunFilterBar = new PipelineRunFilterBar();
