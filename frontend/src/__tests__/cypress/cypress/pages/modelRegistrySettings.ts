import { appChrome } from './appChrome';
import { Contextual } from './components/Contextual';
import { K8sNameDescriptionField } from './components/subComponents/K8sNameDescriptionField';
import { SearchSelector } from './components/subComponents/SearchSelector';

export enum FormFieldSelector {
  NAME = '#mr-name',
  DESCRIPTION = '#mr-description',
  HOST = '#mr-host',
  PORT = '#mr-port',
  USERNAME = '#mr-username',
  PASSWORD = '#mr-password',
  DATABASE = '#mr-database',
}

export enum FormErrorTestId {
  HOST = 'mr-host-error',
  PORT = 'mr-port-error',
  USERNAME = 'mr-username-error',
  PASSWORD = 'mr-password-error',
  DATABASE = 'mr-database-error',
}

export enum DatabaseDetailsTestId {
  HOST = 'mr-db-host',
  PORT = 'mr-db-port',
  USERNAME = 'mr-db-username',
  PASSWORD = 'mr-db-password',
  DATABASE = 'mr-db-database',
}

class ModelRegistrySettings {
  k8sNameDescription = new K8sNameDescriptionField('mr');

  resourceNameSelect = new SearchSelector('existing-ca-resource-selector');

  keySelect = new SearchSelector('existing-ca-key-selector');

  visit(wait = true) {
    cy.visitWithLogin('/settings/model-resources-operations/model-registry');
    if (wait) {
      this.wait();
    }
  }

  navigate() {
    this.findNavItem().click();
    this.wait();
  }

  private wait() {
    this.findHeading();
    cy.testA11y();
  }

  private findHeading() {
    cy.findByTestId('app-page-title').should('exist');
    cy.findByTestId('app-page-title').contains('Model registry settings');
  }

  findNavItem() {
    return appChrome.findNavItem({
      name: 'Model registry settings',
      rootSection: 'Settings',
      subSection: 'Model resources and operations',
    });
  }

  findEmptyState() {
    return cy.findByTestId('mr-settings-empty-state');
  }

  findCreateButton() {
    return cy.findByText('Create model registry');
  }

  findFormField(selector: FormFieldSelector) {
    return cy.get(selector);
  }

  clearFormFields() {
    Object.values(FormFieldSelector).forEach((selector) => {
      this.findFormField(selector).clear();
      this.findFormField(selector).blur();
    });
  }

  findFormError(testId: FormErrorTestId) {
    return cy.findByTestId(testId);
  }

  shouldHaveAllErrors() {
    Object.values(FormErrorTestId).forEach((testId) => this.findFormError(testId).should('exist'));
  }

  shouldHaveNoErrors() {
    Object.values(FormErrorTestId).forEach((testId) =>
      this.findFormError(testId).should('not.exist'),
    );
  }

  findSubmitButton() {
    return cy.findByTestId('modal-submit-button');
  }

  findCancelButton() {
    return cy.findByTestId('modal-cancel-button');
  }

  findManagePermissionsTooltip() {
    return cy.findByRole('tooltip');
  }

  findTable() {
    return cy.findByTestId('model-registries-table');
  }

  findModelRegistryRow(registryName: string) {
    return this.findTable().findByText(registryName).closest('tr');
  }

  managePermissions(registryName: string) {
    this.findModelRegistryRow(registryName).findByText('Manage permissions').click();
  }

  findDatabaseDetail(testId: DatabaseDetailsTestId) {
    return cy.findByTestId(testId);
  }

  findDatabasePasswordHiddenButton() {
    return this.findDatabaseDetail(DatabaseDetailsTestId.PASSWORD).findByTestId(
      'password-hidden-button',
    );
  }

  findConfirmDeleteNameInput() {
    return cy.findByTestId('confirm-delete-input');
  }

  findClusterWideCARadio() {
    return cy.findByTestId('cluster-wide-ca-radio');
  }

  findOpenshiftCARadio() {
    return cy.findByTestId('openshift-ca-radio');
  }

  findExistingCARadio() {
    return cy.findByTestId('existing-ca-radio');
  }

  findUploadNewCertificateRadio() {
    return cy.findByTestId('new-certificate-ca-radio');
  }

  findAddSecureDbMRCheckbox() {
    return cy.findByTestId('add-secure-db-mr-checkbox');
  }

  findExistingCAResourceInputToggle() {
    return cy.findByTestId('existing-ca-resource-selector-toggle');
  }

  findExistingCAKeyInputToggle() {
    return cy.findByTestId('existing-ca-key-selector-toggle');
  }

  getNewCertificateUpload() {
    return new CertificateUpload(() => cy.findByTestId('certificate-upload'));
  }

  findErrorFetchingResourceAlert() {
    return cy.findByTestId('error-fetching-resource-alert');
  }

  findCertificateNote() {
    return cy.findByTestId('certificate-note');
  }
}

class CertificateUpload extends Contextual<HTMLElement> {
  findUploadCertificateInput() {
    return this.find().find('[data-testid="new-certificate-upload"] input[type="file"]');
  }

  uploadPemFile(filePath: string) {
    this.findUploadCertificateInput().selectFile([filePath], { force: true });
  }

  findRestrictedFileUploadHelptext() {
    return cy.findByTestId('restricted-file-example-helpText');
  }
}

export const modelRegistrySettings = new ModelRegistrySettings();
