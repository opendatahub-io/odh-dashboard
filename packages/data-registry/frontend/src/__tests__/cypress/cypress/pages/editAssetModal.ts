import { Modal } from './components/Modal';

class EditAssetModal extends Modal {
  constructor() {
    super(/Edit ".*"/);
  }

  findSaveButton() {
    return cy.findByTestId('edit-asset-save');
  }

  findCancelButton() {
    return cy.findByTestId('edit-asset-cancel');
  }

  // Asset details section (shared with register-data, read-only in edit mode)
  findNameInput() {
    return cy.findByTestId('data-name-input');
  }

  findDescriptionInput() {
    return cy.findByTestId('data-description-input');
  }

  findAssetTypeInput() {
    return cy.findByTestId('asset-type-toggle');
  }

  findFormatToggle() {
    return cy.findByTestId('data-format-toggle');
  }

  findCollectionInput() {
    return cy.findByTestId('data-collection-toggle');
  }

  findAddLabelButton() {
    return cy.findByTestId('data-add-label-button');
  }

  findLabelsInput() {
    return cy.findByTestId('data-labels-input');
  }

  findLabel(name: string) {
    return cy.findByTestId(`data-label-${name}`);
  }

  removeLabel(name: string) {
    return cy.findByTestId(`data-label-remove-${name}`).click();
  }

  // Data location section
  findConnectionToggle() {
    return cy.findByTestId('data-connection-toggle');
  }

  findLocationInput() {
    return cy.findByTestId('data-path-input');
  }

  // Properties section
  findPurposeInput() {
    return cy.findByTestId('data-purpose-input');
  }

  findLicenseToggle() {
    return cy.findByTestId('data-license-toggle');
  }

  findMaturityToggle() {
    return cy.findByTestId('data-maturity-toggle');
  }

  findPiiToggle() {
    return cy.findByTestId('data-pii-toggle');
  }

  // Custom properties section
  findAddCustomPropertyButton() {
    return cy.findByTestId('data-add-custom-property');
  }

  findCustomPropertyKey(index: number) {
    return cy.findByTestId(`data-custom-property-key-${index}`);
  }

  findCustomPropertyValue(index: number) {
    return cy.findByTestId(`data-custom-property-value-${index}`);
  }

  findCustomPropertyRemove(index: number) {
    return cy.findByTestId(`data-custom-property-remove-${index}`);
  }

  // Schema section (tables only)
  findAddColumnButton() {
    return cy.findByTestId('add-schema-column');
  }

  findSchemaColumnName(index: number) {
    return cy.findByTestId(`schema-column-name-${index}`);
  }

  findSchemaColumnTypeToggle(index: number) {
    return cy.findByTestId(`schema-column-type-${index}`);
  }

  findSchemaColumnDescription(index: number) {
    return cy.findByTestId(`schema-column-description-${index}`);
  }

  findSchemaColumnNullable(index: number) {
    return cy.findByTestId(`schema-column-nullable-${index}`);
  }

  findSchemaColumnRemove(index: number) {
    return cy.findByTestId(`schema-column-remove-${index}`);
  }

  findErrorAlert() {
    return this.find().findByTestId('edit-asset-error');
  }
}

export const editAssetModal = new EditAssetModal();
