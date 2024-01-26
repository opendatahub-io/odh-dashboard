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

  mockPipelines(pipelines: PipelineKF[]) {
    return cy.intercept(
      {
        pathname: '/api/proxy/apis/v1beta1/pipelines',
      },
      buildMockPipelines(pipelines),
    );
  }

  mockPipelineVersions(projectName: string, pipelineId: string, versions: PipelineVersionKF[]) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: '/api/proxy/apis/v1beta1/pipeline_versions',
      },
      (req) => {
        req.body = {
          path: '/apis/v1beta1/pipeline_versions',
          method: 'GET',
          host: `https://ds-pipeline-pipelines-definition-${projectName}.apps.user.com`,
          queryParams: {
            sort_by: 'created_at desc',
            page_size: 10,
            'resource_key.id': pipelineId,
            'resource_key.type': 'PIPELINE',
          },
        };

        req.reply(buildMockPipelineVersions(versions));
      },
    );
  }

  toggleExpandRowByIndex(index: number) {
    cy.findByLabelText('Details').eq(index).click();
  }
}

export const pipelinesTable = new PipelinesTable();
