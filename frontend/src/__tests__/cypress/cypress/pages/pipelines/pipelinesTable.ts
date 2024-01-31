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

  mockGetPipelines(pipelines: PipelineKFv2[]) {
    return cy.intercept(
      {
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

  toggleExpandRowByIndex(index: number) {
    cy.findByLabelText('Details').eq(index).click();
  }
}

export const pipelinesTable = new PipelinesTable();
