import { Modal } from './components/Modal';

class DataConnectionModal extends Modal {
  constructor(edit = false) {
    const titles = [
      edit ? 'Edit connection' : 'Add connection',
      `${edit ? 'Edit' : 'Add'} data connection`,
    ];

    super(titles[0]);
  }

  findConnectionTypeDropdown() {
    return this.find().findByTestId('connection-type-dropdown');
  }

  findS3CompatibleStorageOption() {
    return cy.findByText('S3 compatible object storage - v1');
  }

  findSubmitButton() {
    return this.findFooter().findByTestId('data-connection-submit-button');
  }

  findCreateButton() {
    return this.find().findByTestId('modal-submit-button');
  }

  findConnectionNameInput() {
    return this.find().findByTestId('connection-name-desc-name');
  }

  findConnectionDescriptionInput() {
    return this.find().findByTestId('connection-name-desc-description');
  }

  findNameInput() {
    return this.find().findByTestId('field Name');
  }

  findAwsKeyInput() {
    return this.find().findByTestId('field AWS_ACCESS_KEY_ID');
  }

  findAwsSecretKeyInput() {
    return this.find().findByTestId('field AWS_SECRET_ACCESS_KEY');
  }

  findEndpointInput() {
    return this.find().findByTestId('field AWS_S3_ENDPOINT');
  }

  findRegionInput() {
    return this.find().findByTestId('field AWS_DEFAULT_REGION');
  }

  findBucketInput() {
    return this.find().findByTestId('field AWS_S3_BUCKET');
  }

  findWorkbenchConnectionSelect() {
    return cy
      .findByTestId('connect-existing-workbench-group')
      .findByRole('button', { name: 'Notebook select' });
  }

  findNotebookRestartAlert() {
    return this.find().findByTestId('notebook-restart-alert');
  }
}

export const addDataConnectionModal = new DataConnectionModal(false);
export const editDataConnectionModal = new DataConnectionModal(true);
