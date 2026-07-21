import { TableRow } from './components/table';
import { Modal } from './components/Modal';

class ConnectionsPage {
  findTable() {
    return cy.findByTestId('connection-table');
  }

  getConnectionRow(name: string) {
    return new ConnectionTableRow(() =>
      this.findTable().findAllByTestId(`table-row-title`).contains(name).parents('tr'),
    );
  }

  findDataConnectionName() {
    return cy.findByTestId('table-row-title');
  }

  findAddConnectionButton() {
    return cy.findByTestId('add-connection-button');
  }

  findCreateConnectionButton() {
    return cy.findByTestId('create-connection-button');
  }

  findKebabToggle() {
    return cy.get('button[aria-label="Kebab toggle"]');
  }

  findDeleteButton() {
    return cy.contains('.pf-v6-c-menu__item-text', 'Delete');
  }
}

class ConnectionTableRow extends TableRow {
  findStatusCell() {
    return this.find().findByTestId('connection-status-cell');
  }

  findConnectionNameLink() {
    return this.find().findByTestId('connection-name-link');
  }
}
class ConnectionModal extends Modal {
  constructor(edit = false) {
    super(`${edit ? 'Edit' : 'Create'} connection`);
  }

  findConnectionTypeDropdown() {
    return this.find().findByTestId('connection-type-dropdown');
  }

  findConnectionTypeOption(name: string | RegExp) {
    return cy.findByRole('option', { name: new RegExp(name), hidden: true });
  }

  findS3CompatibleStorageOption() {
    return cy.findByText('S3 compatible object storage - v1');
  }

  findOciConnectionType() {
    return cy.findByText('OCI compliant registry - v1');
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

  findOciAccessType() {
    return this.find().findByTestId('field ACCESS_TYPE');
  }

  findOciPullSecretOption() {
    return cy.findByText('Pull secret');
  }

  findOciSecretDetails() {
    return this.find().findByTestId('field .dockerconfigjson');
  }

  uploadSecretDetails(filePath: string) {
    this.findOciSecretDetails().get('input[type=file]').selectFile(filePath, { force: true });
  }

  findOciRegistryHost() {
    return this.find().findByTestId('field OCI_HOST');
  }

  findTestConnectionButton() {
    return this.find().findByTestId('test-connection-button');
  }

  findTestStatusNotTested() {
    return this.find().findByTestId('connection-test-label-not-tested');
  }

  findTestStatusTesting() {
    return this.find().findByTestId('connection-test-label-testing');
  }

  findTestStatusVerified() {
    return this.find().findByTestId('connection-test-label-verified');
  }

  findTestStatusFailed() {
    return this.find().findByTestId('connection-test-label-failed');
  }

  findTestSuccessAlert() {
    return this.find().findByTestId('connection-test-success-alert');
  }

  findTestFailureAlert() {
    return this.find().findByTestId('connection-test-failure-alert');
  }

  findCancelButton() {
    return this.find().findByTestId('modal-cancel-button');
  }
}

export const connectionsPage = new ConnectionsPage();

export const connectionActions = {
  findEditConnectionAction(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('edit-connection-action');
  },
  findDeleteConnectionAction(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('delete-connection-action');
  },
};
export const addConnectionModal = new ConnectionModal(false);
export const editConnectionModal = new ConnectionModal(true);
