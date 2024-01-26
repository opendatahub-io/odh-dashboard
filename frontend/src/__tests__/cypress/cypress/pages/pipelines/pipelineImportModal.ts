import { PipelineKF } from '~/concepts/pipelines/kfTypes';
import { buildMockPipeline } from '~/__mocks__/mockPipelinesProxy';
import { Modal } from '~/__tests__/cypress/cypress/pages/components/Modal';

class PipelineImportModal extends Modal {
  constructor() {
    super('Import pipeline');
  }

  find() {
    return cy.findByTestId('import-pipeline-modal').parents('div[role="dialog"]');
  }

  findPipelineNameInput() {
    return this.find().findByRole('textbox', { name: 'Pipeline name' });
  }

  findPipelineDescriptionInput() {
    return this.find().findByRole('textbox', { name: 'Pipeline description' });
  }

  findUploadPipelineInput() {
    return this.find().get('[data-testid="pipeline-file-upload"] input[type="file"]');
  }

  findSubmitButton() {
    return this.findFooter().findByRole('button', { name: 'Import pipeline' });
  }

  fillPipelineName(value: string) {
    this.findPipelineNameInput().clear().type(value);
  }

  fillPipelineDescription(value: string) {
    this.findPipelineDescriptionInput().clear().type(value);
  }

  uploadPipelineYaml(filePath: string) {
    this.findUploadPipelineInput().selectFile([filePath], { force: true });
  }

  mockUploadPipeline(params: Partial<PipelineKF>) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: '/api/proxy/apis/v1beta1/pipelines/upload',
        times: 1,
      },
      (req) => {
        req.body = {
          path: '/apis/v1beta1/pipelines/upload',
          method: 'POST',
          host: 'https://ds-pipeline-pipelines-definition-test-project-name.apps.user.com',
          queryParams: params,
          fileContents: 'test-yaml-content\n',
        };

        req.reply(buildMockPipeline(params));
      },
    );
  }

  submit(): void {
    this.findSubmitButton().click();
  }
}

export const pipelineImportModal = new PipelineImportModal();
