/* eslint-disable camelcase */
import { PipelineKFv2, PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';
import { buildMockPipelines } from '~/__mocks__/mockPipelinesProxy';
import { buildMockPipelineVersionsV2 } from '~/__mocks__/mockPipelineVersionsProxy';

class PipelinesTable {
  private testId = 'pipelines-table';

  find() {
    return cy.findByTestId(this.testId);
  }

  findRowByName(name: string) {
    return this.find().findAllByRole('heading', { name }).parents('tr');
  }

  shouldRowNotBeVisible(name: string) {
    return this.find().get('tr').contains(name).should('not.exist');
  }

  shouldBeEmpty() {
    return cy.findByTestId('global-no-pipelines').should('exist');
  }

  mockDeletePipeline(pipeline: PipelineKFv2) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/proxy/apis/v2beta1/pipelines/${pipeline.pipeline_id}`,
      },
      {},
    );
  }

  mockDeletePipelineVersion(version: PipelineVersionKFv2) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/proxy/apis/v2beta1/pipelines/${version.pipeline_id}/versions/${version.pipeline_version_id}`,
      },
      {},
    );
  }

  mockGetPipelines(pipelines: PipelineKFv2[]) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: '/api/proxy/apis/v2beta1/pipelines',
      },
      buildMockPipelines(pipelines),
    );
  }

  mockGetPipelineVersions(versions: PipelineVersionKFv2[], pipelineId: string) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/proxy/apis/v2beta1/pipelines/${pipelineId}/versions`,
      },
      buildMockPipelineVersionsV2(versions),
    );
  }

  toggleExpandRowByName(name: string) {
    this.findRowByName(name).findByLabelText('Details').click();
  }

  toggleCheckboxByRowName(name: string) {
    this.findRowByName(name).findByRole('checkbox').click();
  }

  toggleExpandRowByIndex(index: number) {
    this.find().findByLabelText('Details').eq(index).click();
  }
}

export const pipelinesTable = new PipelinesTable();
