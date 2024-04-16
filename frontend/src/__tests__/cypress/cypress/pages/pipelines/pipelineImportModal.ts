import { CreatePipelineAndVersionKFData, PipelineKFv2 } from '~/concepts/pipelines/kfTypes';
import { buildMockPipelineV2 } from '~/__mocks__/mockPipelinesProxy';
import { Modal } from '~/__tests__/cypress/cypress/pages/components/Modal';

class PipelineImportModal extends Modal {
  constructor() {
    super('Import pipeline');
  }

  find() {
    return cy.findByTestId('import-pipeline-modal').parents('div[role="dialog"]');
  }

  findPipelineNameInput() {
    return this.find().findByTestId('pipeline-name');
  }

  findPipelineDescriptionInput() {
    return this.find().findByTestId('pipeline-description');
  }

  findUploadPipelineInput() {
    return this.find().find('[data-testid="pipeline-file-upload"] input[type="file"]');
  }

  findSubmitButton() {
    return this.findFooter().findByTestId('import-button');
  }

  findUploadPipelineRadio() {
    return this.find().findByTestId('upload-file-radio');
  }

  findImportPipelineRadio() {
    return this.find().findByTestId('import-url-radio');
  }

  findPipelineUrlInput() {
    return this.find().findByTestId('pipeline-url-input');
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

  mockCreatePipelineAndVersion(params: CreatePipelineAndVersionKFData, namespace: string) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/service/pipelines/${namespace}/dspa/apis/v2beta1/pipelines/create`,
        times: 1,
      },
      buildMockPipelineV2(params.pipeline),
    );
  }

  mockUploadPipeline(params: Partial<PipelineKFv2>, namespace: string) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/service/pipelines/${namespace}/dspa/apis/v2beta1/pipelines/upload`,
        times: 1,
      },
      buildMockPipelineV2(params),
    );
  }

  submit(): void {
    this.findSubmitButton().click();
  }
}

export const pipelineImportModal = new PipelineImportModal();
