import { Modal } from './components/Modal';

class DataConnectionModal extends Modal {
  constructor(edit = false) {
    super(`${edit ? 'Edit' : 'Add'} data connection`);
  }

  findSubmitButton() {
    return this.findFooter().findByTestId('data-connection-submit-button');
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
