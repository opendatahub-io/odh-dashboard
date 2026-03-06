import type {
  CreatePipelineAndVersionKFData,
  PipelineKF,
} from '@odh-dashboard/internal/concepts/pipelines/kfTypes';
import { buildMockPipeline } from '@odh-dashboard/internal/__mocks__/mockPipelinesProxy';
import { Modal } from '../components/Modal';

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

  findPipelineResourceNameInput() {
    return this.find().findByTestId('pipeline-resourceName');
  }

  findPipelineEditResourceNameButton() {
    return this.find().findByTestId('pipeline-editResourceLink');
  }

  findPipelineDescriptionInput() {
    return this.find().findByTestId('pipeline-description');
  }

  findUploadPipelineInput() {
    return this.find().find('[data-testid="pipeline-file-upload"] input[type="file"]');
  }

  findSubmitButton(options?: Partial<Cypress.Loggable & Cypress.Timeoutable>) {
    return this.findFooter().findByTestId('modal-submit-button', options);
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

  fillPipelineResourceName(value: string) {
    this.findPipelineResourceNameInput().clear().type(value);
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
    // Wait for the button to be enabled before clicking (it may be disabled during file upload/processing)
    // The button should be enabled once file validation and duplicate name check complete
    // Using a longer timeout as the duplicate name check is debounced
    this.findSubmitButton({ timeout: 30000 }).should('be.enabled').click();
  }
}

export const pipelineImportModal = new PipelineImportModal();
