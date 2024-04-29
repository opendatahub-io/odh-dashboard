/* eslint-disable camelcase */
import { PipelineKFv2, PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';
import { buildMockPipelines } from '~/__mocks__/mockPipelinesProxy';
import { buildMockPipelineVersionsV2 } from '~/__mocks__/mockPipelineVersionsProxy';
import { TableRow } from '~/__tests__/cypress/cypress/pages/components/table';

class PipelinesTableRow extends TableRow {
  findPipelineName(name: string) {
    return this.find().findByTestId(`table-row-title-${name}`).find('a');
  }

  toggleExpandByIndex(index: number) {
    this.find().find('button').should('have.attr', 'aria-label', 'Details').eq(index).click();
  }

  toggleCheckboxByRowName() {
    this.find().find(`[data-label=Checkbox]`).find('input').check();
  }

  shouldNotHavePipelineVersion() {
    this.find().parents('tbody').findByTestId('no-pipeline-versions').should('exist');
    return this;
  }
}

class PipelinesTable {
  private testId = 'pipelines-table';

  find() {
    return cy.findByTestId(this.testId);
  }

  findRows() {
    return this.find().find('tbody tr');
  }

  findTableHeaderButton(name: string) {
    return this.find().find('thead').findByRole('button', { name });
  }

  getRowByName(name: string) {
    return new PipelinesTableRow(() =>
      this.find().findByTestId(`table-row-title-${name}`).parents('tr'),
    );
  }

  shouldRowNotBeVisible(name: string) {
    this.find().find('tr').contains(name).should('not.exist');
    return this;
  }

  shouldBeEmpty() {
    return cy.findByTestId('global-no-pipelines').should('exist');
  }

  selectFilterByName(name: string) {
    cy.findByTestId('pipeline-filter')
      .findByTestId('pipeline-filter-dropdown')
      .findDropdownItem(name)
      .click();
  }

  findFilterTextField() {
    return cy.findByTestId('pipeline-filter').findByTestId('pipeline-filter-text-field');
  }

  findEmptyResults() {
    return cy.findByTestId('no-result-found-title');
  }

  mockDeletePipeline(pipeline: PipelineKFv2, namespace: string) {
    return cy.intercept(
      {
        method: 'DELETE',
        pathname: `/api/service/pipelines/${namespace}/dspa/apis/v2beta1/pipelines/${pipeline.pipeline_id}`,
      },
      {},
    );
  }

  mockDeletePipelineVersion(version: PipelineVersionKFv2, namespace: string) {
    return cy.intercept(
      {
        method: 'DELETE',
        pathname: `/api/service/pipelines/${namespace}/dspa/apis/v2beta1/pipelines/${version.pipeline_id}/versions/${version.pipeline_version_id}`,
      },
      {},
    );
  }

  mockGetPipelines(pipelines: PipelineKFv2[], namespace: string) {
    return cy.intercept(
      {
        method: 'GET',
        pathname: `/api/service/pipelines/${namespace}/dspa/apis/v2beta1/pipelines`,
      },
      buildMockPipelines(pipelines),
    );
  }

  mockGetPipelineVersions(versions: PipelineVersionKFv2[], pipelineId: string, namespace: string) {
    return cy.intercept(
      {
        method: 'GET',
        pathname: `/api/service/pipelines/${namespace}/dspa/apis/v2beta1/pipelines/${pipelineId}/versions`,
      },
      buildMockPipelineVersionsV2(versions),
    );
  }
}

export const pipelinesTable = new PipelinesTable();
