import { TableRow } from './components/table';
import { Modal } from './components/Modal';

class ConnectionsPage {
  findTable() {
    return cy.findByTestId('connection-table');
  }

  getConnectionRow(name: string) {
    return new TableRow(() =>
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
class ConnectionModal extends Modal {
  constructor(edit = false) {
    super(`${edit ? 'Edit' : 'Add'} connection`);
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
}

export const connectionsPage = new ConnectionsPage();
export const addConnectionModal = new ConnectionModal(false);
export const editConnectionModal = new ConnectionModal(true);
