import { SearchSelector } from '../components/subComponents/SearchSelector';

export enum FormFieldSelector {
  MODEL_NAME = '#model-name',
  MODEL_DESCRIPTION = '#model-description',
  VERSION_NAME = '#version-name',
  VERSION_DESCRIPTION = '#version-description',
  SOURCE_MODEL_FORMAT = '#source-model-format',
  SOURCE_MODEL_FORMAT_VERSION = '#source-model-format-version',
  LOCATION_TYPE_OBJECT_STORAGE = '#location-type-object-storage',
  LOCATION_ENDPOINT = '#location-endpoint',
  LOCATION_BUCKET = '#location-bucket',
  LOCATION_REGION = '#location-region',
  LOCATION_PATH = '#location-path',
  LOCATION_TYPE_URI = '#location-type-uri',
  LOCATION_URI = '#location-uri',
  JOB_NAME = '#model-transfer-job-name',
  LOCATION_S3_ACCESS_KEY_ID = '#location-s3-access-key-id',
  LOCATION_S3_SECRET_ACCESS_KEY = '#location-s3-secret-access-key',
  DESTINATION_OCI_REGISTRY = '#destination-oci-registry',
  DESTINATION_OCI_URI = '#destination-oci-uri',
  DESTINATION_OCI_USERNAME = '#destination-oci-username',
  DESTINATION_OCI_PASSWORD = '#destination-oci-password',
}

class RegisterModelPage {
  projectDropdown = new SearchSelector('project-selector', 'connection-autofill-modal');

  visit() {
    this.visitWithRegistry('modelregistry-sample');
  }

  visitWithRegistry(registryName: string) {
    cy.visitWithLogin(`/ai-hub/models/registry/${registryName}/register/model`);
    this.wait(registryName);
  }

  private wait(registryName = 'modelregistry-sample') {
    cy.findByTestId('app-page-title').should('exist');
    cy.findByTestId('app-page-title').contains('Register model');
    cy.findByText(`Model registry - ${registryName}`).should('exist');
    cy.testA11y();
  }

  findAppTitle() {
    return cy.findByTestId('app-page-title');
  }

  findBreadcrumbModelName() {
    return cy.findByTestId('breadcrumb-model-name');
  }

  findFormField(selector: FormFieldSelector) {
    return cy.get(selector);
  }

  findObjectStorageAutofillButton() {
    return cy.findByTestId('object-storage-autofill-button');
  }

  findURIAutofillButton() {
    return cy.findByTestId('uri-autofill-button');
  }

  findConnectionAutofillModal() {
    return cy.findByTestId('connection-autofill-modal');
  }

  findConnectionSelector() {
    return this.findConnectionAutofillModal().findByTestId('select-connection');
  }

  findAutofillButton() {
    return cy.findByTestId('autofill-modal-button');
  }

  findSubmitButton(timeout?: number) {
    return cy.findByTestId('create-button', { timeout });
  }

  findModelNameError() {
    return cy.findByTestId('model-name-error');
  }

  findRegistrationModeToggleGroup(timeout?: number) {
    return cy.findByTestId('registration-mode-toggle-group', { timeout });
  }

  findRegisterToggle() {
    return cy.findByTestId('registration-mode-register');
  }

  findRegisterAndStoreToggle() {
    return cy.findByTestId('registration-mode-register-and-store');
  }

  findRegisterAndStoreToggleButton() {
    return this.findRegisterAndStoreToggle().find('button');
  }

  findNamespaceSelector(timeout?: number) {
    return cy.findByTestId('form-namespace-selector', { timeout });
  }

  findNamespaceSelectorTrigger() {
    return cy.findByTestId('form-namespace-selector-trigger');
  }

  findNamespaceTextInput(timeout?: number) {
    return cy.findByTestId('form-namespace-text-input', { timeout });
  }

  /**
   * Namespace options render in the SimpleSelect menu (often portaled). Query by role after opening the menu.
   */
  findNamespaceOption(name: string) {
    return cy.findByRole('option', { name });
  }

  findOriginLocationSection(timeout?: number) {
    return cy.findByTestId('model-origin-location-section', { timeout });
  }

  findDestinationLocationSection(timeout?: number) {
    return cy.findByTestId('model-destination-location-section', { timeout });
  }
}

export const registerModelPage = new RegisterModelPage();
