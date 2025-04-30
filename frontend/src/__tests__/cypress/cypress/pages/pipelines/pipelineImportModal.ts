import type { CreatePipelineAndVersionKFData, PipelineKF } from '~/concepts/pipelines/kfTypes';
import { buildMockPipeline } from '~/__mocks__/mockPipelinesProxy';
import { Modal } from '~/__tests__/cypress/cypress/pages/components/Modal';

class PipelineImportModal extends Modal {
  constructor() {
    super('Import pipeline');
  }

  find() {
    return cy.findByTestId('import-pipeline-modal');
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
    return this.findFooter().findByTestId('modal-submit-button');
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

  findUploadError() {
    return this.find().findByTestId('pipeline-file-upload-error');
  }

  findImportModalError() {
    return this.find().findByTestId('error-message-alert');
  }

  mockCreatePipelineAndVersion(params: CreatePipelineAndVersionKFData, namespace: string) {
    return cy.interceptOdh(
      'POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/create',
      {
        path: { namespace, serviceName: 'dspa' },
        times: 1,
      },
      buildMockPipeline(params.pipeline),
    );
  }

  mockUploadPipeline(params: Partial<PipelineKF>, namespace: string) {
    return cy.interceptOdh(
      'POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/upload',
      { path: { namespace, serviceName: 'dspa' }, times: 1 },
      buildMockPipeline(params),
    );
  }

  submit(): void {
    this.findSubmitButton().click();
  }
}

export const pipelineImportModal = new PipelineImportModal();
