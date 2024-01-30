/* eslint-disable camelcase */
import { PipelineKF, PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import { buildMockPipelines } from '~/__mocks__/mockPipelinesProxy';
import { buildMockPipelineVersions } from '~/__mocks__/mockPipelineVersionsProxy';

class PipelinesTable {
  private testId = 'pipelines-table';

  find() {
    return cy.findByTestId(this.testId);
  }

  findRowByName(name: string) {
    return this.find().findAllByRole('heading', { name }).parents('tr');
  }

  mockGetPipelines(pipelines: PipelineKF[]) {
    return cy.intercept(
      {
        pathname: '/api/proxy/apis/v1beta1/pipelines',
      },
      buildMockPipelines(pipelines),
    );
  }

  mockGetPipelineVersions(versions: PipelineVersionKF[]) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: '/api/proxy/apis/v1beta1/pipeline_versions',
      },
      buildMockPipelineVersions(versions),
    );
  }

  toggleExpandRowByIndex(index: number) {
    cy.findByLabelText('Details').eq(index).click();
  }
}

export const pipelinesTable = new PipelinesTable();
