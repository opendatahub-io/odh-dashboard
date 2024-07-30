import type {
  CreatePipelineVersionKFData,
  PipelineVersionKFv2,
} from '~/concepts/pipelines/kfTypes';
import { buildMockPipelineVersionV2 } from '~/__mocks__/mockPipelineVersionsProxy';
import { Modal } from '~/__tests__/cypress/cypress/pages/components/Modal';

class PipelineImportModal extends Modal {
  constructor() {
    super('Upload new version');
  }

  find() {
    return cy.findByTestId('upload-version-modal').parents('div[role="dialog"]');
  }

  findSubmitButton() {
    return this.findFooter().findByRole('button', { name: 'Upload', hidden: true });
  }

  findPipelineSelect() {
    return this.find().findByTestId('pipeline-toggle-button');
  }

  findVersionNameInput() {
    return this.find().findByTestId('pipeline-version-name');
  }

  findVersionDescriptionInput() {
    return this.find().findByTestId('pipeline-version-description');
  }

  findUploadPipelineInput() {
    return this.find().find('[data-testid="pipeline-file-upload"] input[type="file"]');
  }

  uploadPipelineYaml(filePath: string) {
    this.findUploadPipelineInput().selectFile([filePath], { force: true });
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

  findCodeSourceInput() {
    return this.find().findByTestId('code-source-input');
  }

  findImportModalError() {
    return this.find().findByTestId('import-modal-error');
  }

  selectPipelineByName(name: string) {
    this.findPipelineSelect()
      .click()
      .parents()
      .findByTestId('pipeline-selector-table-list')
      .find('tr')
      .contains(name)
      .click();
  }

  fillVersionName(value: string) {
    this.findVersionNameInput().clear().type(value);
  }

  fillVersionDescription(value: string) {
    this.findVersionDescriptionInput().clear().type(value);
  }

  submit(): void {
    this.findSubmitButton().click();
  }

  mockCreatePipelineVersion(params: CreatePipelineVersionKFData, namespace: string) {
    return cy.interceptOdh(
      'POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions',
      { path: { namespace, serviceName: 'dspa', pipelineId: params.pipeline_id }, times: 1 },
      buildMockPipelineVersionV2(params),
    );
  }

  mockUploadVersion(params: Partial<PipelineVersionKFv2>, namespace: string) {
    return cy.interceptOdh(
      'POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/upload_version',
      { path: { namespace, serviceName: 'dspa' }, times: 1 },
      buildMockPipelineVersionV2(params),
    );
  }
}

export const pipelineVersionImportModal = new PipelineImportModal();
