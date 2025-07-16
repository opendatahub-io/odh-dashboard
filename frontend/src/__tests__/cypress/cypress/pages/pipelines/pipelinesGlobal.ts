import { DeleteModal } from '#~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { Modal } from '#~/__tests__/cypress/cypress/pages/components/Modal';
import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';
import { SearchSelector } from '#~/__tests__/cypress/cypress/pages/components/subComponents/SearchSelector';
import { MANAGE_PIPELINE_SERVER_TITLE } from '#~/concepts/pipelines/content/const';

class PipelinesGlobal {
  projectDropdown = new SearchSelector('project-selector');

  visit(projectName: string) {
    cy.visitWithLogin(`/pipelines/${projectName}`);
    this.wait();
  }

  navigate() {
    appChrome.findNavItem('Pipelines', 'Data Science Pipelines').click();
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').contains('Pipelines');
    cy.testA11y();
  }

  findEmptyState() {
    return cy.findByTestId('empty-state-title');
  }

  findPipelineTimeoutErrorMessage() {
    return cy.findByTestId('timeout-pipeline-error-message');
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

  isApiAvailable() {
    return cy.findByTestId('pipelines-api-not-available').should('not.exist');
  }

  findIsServerIncompatible() {
    return cy.findByTestId('incompatible-pipelines-server');
  }

  shouldHaveIncompatibleTitleText() {
    cy.findByTestId('incompatible-pipelines-server-title').should(
      'contain.text',
      'Unsupported pipeline and pipeline server version',
    );
    return this;
  }

  findDeletePipelineServerButton() {
    return this.findIsServerIncompatible().findByTestId('delete-pipeline-server-button');
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

  private findSelectViableConnectionButton() {
    return cy.findByTestId('select-connection');
  }

  selectViableConnection(name: string) {
    this.findSelectViableConnectionButton().click();
    cy.findByRole('menuitem', { name }).click();
  }

  findToggleButton(name: string) {
    return this.find().findByRole('button', { name });
  }

  findAdvancedSettingsButton() {
    return this.find()
      .findByTestId('advanced-settings-section')
      .get('[id=advanced-settings-toggle]');
  }

  findExternalMYSQLDatabaseRadio() {
    return this.find().findByTestId('external-database-type-radio');
  }

  findPipelineStoreCheckbox() {
    return this.find().findByTestId('pipeline-kubernetes-store-checkbox');
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

class ManagePipelineServerModal extends Modal {
  constructor() {
    super(MANAGE_PIPELINE_SERVER_TITLE);
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

  findPipelineStoreCheckbox() {
    return this.find().findByTestId('pipeline-kubernetes-store-checkbox');
  }

  getPipelineCachingCheckbox() {
    return this.find().findByTestId('pipeline-cache-enabling');
  }

  findButton(name: string, isEnabled: boolean) {
    const id = `managePipelineServer-modal-${name}Btn`;
    const enabledState = isEnabled ? 'be.enabled' : 'be.disabled';
    return this.find().findByTestId(id).should(enabledState).should('be.visible');
  }
}

class PipelineDeleteModal extends DeleteModal {
  constructor() {
    super();
  }

  find() {
    return cy.findByTestId('delete-pipeline-modal');
  }
}

export const pipelineDeleteModal = new PipelineDeleteModal();
export const pipelinesGlobal = new PipelinesGlobal();
export const configurePipelineServerModal = new ConfigurePipelineServerModal();
export const managePipelineServerModal = new ManagePipelineServerModal();
