import type { CreatePipelineVersionKFData, PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import { buildMockPipelineVersion } from '~/__mocks__/mockPipelineVersionsProxy';
import { Modal } from '~/__tests__/cypress/cypress/pages/components/Modal';
import { SearchSelector } from '~/__tests__/cypress/cypress/pages/components/subComponents/SearchSelector';

class PipelineImportModal extends Modal {
  pipelineSelector = new SearchSelector('pipeline-selector');

  constructor() {
    super('Upload new version');
  }

  find() {
    return cy.findByTestId('import-pipeline-modal').parents('div[role="dialog"]');
  }

  findSubmitButton() {
    return this.findFooter().findByRole('button', { name: 'Upload', hidden: true });
  }

  findVersionNameInput() {
    return this.find().findByTestId('pipeline-name');
  }

  findVersionDescriptionInput() {
    return this.find().findByTestId('pipeline-description');
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
    this.pipelineSelector
      .findToggleButton()
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
      buildMockPipelineVersion(params),
    );
  }

  mockUploadVersion(params: Partial<PipelineVersionKF>, namespace: string) {
    return cy.interceptOdh(
      'POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/upload_version',
      { path: { namespace, serviceName: 'dspa' }, times: 1 },
      buildMockPipelineVersion(params),
    );
  }
}

export const pipelineVersionImportModal = new PipelineImportModal();
