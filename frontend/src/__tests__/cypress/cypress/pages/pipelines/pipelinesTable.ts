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

  private shouldRowExist = (name: string) => this.find().get('tr').contains(name).should('exist');

  private shouldRowNotExist = (name: string) =>
    this.find().get('tr').contains(name).should('not.exist');

  checkRow() {
    return {
      shouldExist: (name: string) => this.shouldRowExist(name),
      shouldNotExist: (name: string) => this.shouldRowNotExist(name),
    };
  }

  mockGetPipelines(pipelines: PipelineKF[], namespace: string) {
    return cy.intercept(
      {
        pathname: `/api/service/pipelines/${namespace}/pipelines-definition/apis/v1beta1/pipelines`,
      },
      buildMockPipelines(pipelines),
    );
  }

  mockGetPipelineVersions(versions: PipelineVersionKF[], namespace: string) {
    return cy.intercept(
      {
        method: 'GET',
        pathname: `/api/service/pipelines/${namespace}/pipelines-definition/apis/v1beta1/pipeline_versions`,
      },
      buildMockPipelineVersions(versions),
    );
  }

  toggleExpandRowByName(name: string) {
    this.findRowByName(name).findByLabelText('Details').click();
  }

  toggleCheckboxByRowName(name: string) {
    this.findRowByName(name).findByRole('checkbox').click();
  }
}

export const pipelinesTable = new PipelinesTable();
