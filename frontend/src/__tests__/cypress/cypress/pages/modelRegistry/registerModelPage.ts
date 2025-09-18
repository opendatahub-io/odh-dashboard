import { SearchSelector } from '#~/__tests__/cypress/cypress/pages/components/subComponents/SearchSelector';

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
}

class RegisterModelPage {
  projectDropdown = new SearchSelector('project-selector', 'connection-autofill-modal');

  visit() {
    const preferredModelRegistry = 'modelregistry-sample';
    cy.visitWithLogin(`/ai-hub/registry/${preferredModelRegistry}/register-model`);
    this.wait();
  }

  visitWithRegistry(registryName: string) {
    cy.visitWithLogin(`/ai-hub/registry/${registryName}/register-model`);
    this.waitWithRegistry(registryName);
  }

  private wait() {
    const preferredModelRegistry = 'modelregistry-sample';
    cy.findByTestId('app-page-title').should('exist');
    cy.findByTestId('app-page-title').contains('Register model');
    cy.findByText(`Model registry - ${preferredModelRegistry}`).should('exist');
    cy.testA11y();
  }

  private waitWithRegistry(registryName: string) {
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

  findSubmitButton() {
    return cy.findByTestId('create-button');
  }

  findModelNameError() {
    return cy.findByTestId('model-name-error');
  }
}

export const registerModelPage = new RegisterModelPage();
