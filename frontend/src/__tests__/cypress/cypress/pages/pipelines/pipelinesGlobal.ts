import { DeleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { Modal } from '~/__tests__/cypress/cypress/pages/components/Modal';

class PipelinesGlobal {
  visit(projectName: string) {
    cy.visit(`/pipelines/${projectName}`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').contains('Pipelines');
    cy.testA11y();
  }

  findEmptyState() {
    return cy.findByTestId('empty-state-title');
  }

  findConfigurePipelineServerButton() {
    return cy.findByTestId('create-pipeline-button');
  }

  private findPipelineServerActionButton() {
    return cy.findByTestId('pipeline-server-action');
  }

  selectPipelineServerAction(name: string) {
    this.findPipelineServerActionButton().click();
    cy.findByRole('menuitem', { name }).click();
  }

  findImportPipelineButton() {
    return cy.findByTestId('import-pipeline-button');
  }

  findUploadVersionButton() {
    cy.findByTestId('import-pipeline-split-button').click();
    return cy.findByRole('menuitem').get('span').contains('Upload new version');
  }

  private findProjectSelect() {
    return cy.findByTestId('project-selector-dropdown');
  }

  isApiAvailable() {
    return cy.findByTestId('pipelines-api-not-available').should('not.exist');
  }

  findIsServerIncompatible() {
    return cy.findByTestId('incompatible-pipelines-server');
  }

  findDeletePipelineServerButton() {
    return this.findIsServerIncompatible().findByTestId('delete-pipeline-server-button');
  }

  selectProjectByName(name: string) {
    this.findProjectSelect().findDropdownItem(name).click();
  }

  findDeleteButton() {
    return cy.findByTestId('global-pipelines-kebab-actions').findDropdownItem('Delete');
  }
}

class ConfigurePipelineServerModal extends Modal {
  constructor() {
    super('Configure pipeline server');
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

  findSubmitButton() {
    return this.find().findByTestId('modal-submit-button');
  }

  findShowPasswordButton() {
    return this.find().findByRole('button', { name: 'Show password' });
  }

  private findSelectDataConnectionButton() {
    return cy.findByTestId('select-data-connection');
  }

  selectDataConnection(name: string) {
    this.findSelectDataConnectionButton().click();
    cy.findByRole('menuitem', { name }).click();
  }

  findToggleButton() {
    return this.find().findByRole('button', { name: 'Show advanced database options' });
  }

  findExternalMYSQLDatabaseRadio() {
    return this.find().findByTestId('external-database-type-radio');
  }

  findHostInput() {
    return this.find().findByTestId('field Host');
  }

  findPortInput() {
    return this.find().findByTestId('field Port');
  }

  findUsernameInput() {
    return this.find().findByTestId('field Username');
  }

  findPasswordInput() {
    return this.find().findByTestId('field Password');
  }

  findDatabaseInput() {
    return this.find().findByTestId('field Database');
  }
}

class ViewPipelineServerModal extends Modal {
  constructor() {
    super('View pipeline server');
  }

  findDoneButton() {
    return this.find().findByTestId('view-pipeline-server-done-button');
  }

  shouldHaveAccessKey(value: string) {
    this.find().findByTestId('access-key-field').should('have.text', value);
    return this;
  }

  shouldHaveSecretKey(value: string) {
    this.find().findByTestId('secret-key-field').should('have.text', value);
    return this;
  }

  shouldHaveBucketName(value: string) {
    this.find().findByTestId('bucket-field').should('have.text', value);
    return this;
  }

  shouldHaveEndPoint(value: string) {
    this.find().findByTestId('endpoint-field').should('have.text', value);
    return this;
  }

  findPasswordHiddenButton() {
    return this.find().findByTestId('password-hidden-button');
  }
}

class PipelineDeleteModal extends DeleteModal {
  constructor() {
    super();
  }

  find() {
    return cy.findByTestId('delete-pipeline-modal').parents('div[role="dialog"]');
  }
}

export const pipelineDeleteModal = new PipelineDeleteModal();
export const pipelinesGlobal = new PipelinesGlobal();
export const configurePipelineServerModal = new ConfigurePipelineServerModal();
export const viewPipelineServerModal = new ViewPipelineServerModal();
