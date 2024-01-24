import { PipelineKF } from '~/concepts/pipelines/kfTypes';
import { buildMockPipelines } from '~/__mocks__/mockPipelinesProxy';

class PipelinesTable {
  private testId = 'pipelines-table';

  find() {
    return cy.findByTestId(this.testId);
  }

  findRowByName(name: string) {
    return this.find().findAllByRole('heading', { name });
  }

  mockPipelines(pipelines: PipelineKF[]) {
    return cy.intercept(
      {
        pathname: '/api/proxy/apis/v1beta1/pipelines',
      },
      buildMockPipelines(pipelines),
    );
  }

  toggleExpandRowByIndex(index: number) {
    cy.findByLabelText('Details').eq(index).click();
  }
}

export const pipelinesTable = new PipelinesTable();
