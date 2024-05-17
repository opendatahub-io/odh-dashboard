/* eslint-disable camelcase */
import { PipelineKFv2, PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';
import { buildMockPipelines } from '~/__mocks__/mockPipelinesProxy';
import { buildMockPipelineVersionsV2 } from '~/__mocks__/mockPipelineVersionsProxy';
import { TableRow } from '~/__tests__/cypress/cypress/pages/components/table';

class PipelinesTableRow extends TableRow {
  findPipelineVersionsTable() {
    return this.find().parent().findByTestId(`pipeline-versions-table`);
  }

  shouldNotHavePipelineVersion() {
    this.find().parents('tbody').findByTestId('no-pipeline-versions').should('exist');
    return this;
  }

  getPipelineVersionRowById(id: string) {
    return new PipelineVersionsTableRow(
      () =>
        this.findPipelineVersionsTable().findByTestId([
          'pipeline-version-row',
          id,
        ]) as unknown as Cypress.Chainable<JQuery<HTMLTableRowElement>>,
    );
  }
}

class PipelineVersionsTableRow extends TableRow {
  findPipelineVersionLink() {
    return this.find().findByTestId(`table-row-title`).find('a');
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

  getRowById(id: string) {
    return new PipelinesTableRow(
      () =>
        this.find().findByTestId(['pipeline-row', id]) as unknown as Cypress.Chainable<
          JQuery<HTMLTableRowElement>
        >,
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
    return cy.interceptOdh(
      'DELETE /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId',
      { path: { namespace, serviceName: 'dspa', pipelineId: pipeline.pipeline_id } },
      {},
    );
  }

  mockDeletePipelineVersion(version: PipelineVersionKFv2, namespace: string) {
    return cy.interceptOdh(
      'DELETE /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId',
      {
        path: {
          namespace,
          serviceName: 'dspa',
          pipelineId: version.pipeline_id,
          pipelineVersionId: version.pipeline_version_id,
        },
      },
      {},
    );
  }

  mockGetPipelines(pipelines: PipelineKFv2[], namespace: string) {
    return cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines',
      {
        path: { namespace, serviceName: 'dspa' },
      },
      buildMockPipelines(pipelines),
    );
  }

  mockGetPipelineVersions(versions: PipelineVersionKFv2[], pipelineId: string, namespace: string) {
    return cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions',
      { path: { namespace, serviceName: 'dspa', pipelineId } },
      buildMockPipelineVersionsV2(versions),
    );
  }
}

export const pipelinesTable = new PipelinesTable();
