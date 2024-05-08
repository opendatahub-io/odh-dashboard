import { PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import { buildMockPipelineVersion } from '~/__mocks__/mockPipelineVersionsProxy';
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
    return this.find().findByRole('textbox', { name: 'Pipeline version name', hidden: true });
  }

  findVersionDescriptionInput() {
    return this.find().findByRole('textbox', {
      name: 'Pipeline version description',
      hidden: true,
    });
  }

  findUploadPipelineInput() {
    return this.find().get('[data-testid="pipeline-file-upload"] input[type="file"]');
  }

  uploadPipelineYaml(filePath: string) {
    this.findUploadPipelineInput().selectFile([filePath], { force: true });
  }

  selectPipelineByName(name: string) {
    this.findPipelineSelect()
      .click()
      .get('[data-id="pipeline-selector-table-list"]')
      .findByText(name)
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

  mockUploadVersion(params: Partial<PipelineVersionKF>, namespace: string) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/service/pipelines/${namespace}/pipelines-definition/apis/v1beta1/pipelines/upload_version`,
        times: 1,
      },
      buildMockPipelineVersion(params),
    );
  }
}

export const pipelineVersionImportModal = new PipelineImportModal();
