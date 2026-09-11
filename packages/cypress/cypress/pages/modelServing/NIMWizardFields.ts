import { SubComponentBase } from '../components/subComponents/SubComponentBase';

/** The NIM specific fields of the model deployment wizard -- image selection and PVC caching. */
export class NIMWizardFields extends SubComponentBase {
  findImageSelect(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findScope().findByTestId('nim-image-select');
  }

  selectImage(name: string): void {
    // Escape regex special characters to match literal text
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    this.findImageSelect().click();
    cy.findByRole('option', { name: new RegExp(escapedName) }).click();
  }

  findImageNotFoundWarning(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findScope().findByTestId('nim-image-not-found-warning');
  }

  findImageSelectOptions(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('listbox').findAllByRole('option');
  }

  findStorageModeSelect(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findScope().findByTestId('nim-storage-mode-select');
  }

  findPVCNameInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findScope().findByTestId('nim-pvc-name-input');
  }

  findSubPathInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findScope().findByTestId('nim-subpath-input');
  }

  findStorageClassSelect(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findScope().findByTestId('nim-storage-class-select');
  }

  findStorageSizeInput(): Cypress.Chainable<JQuery<HTMLInputElement>> {
    return this.findScope().findByTestId('nim-storage-size-input').find('input');
  }

  /** PF NumberInput is controlled — use select-all instead of clear().type() to avoid stale values. */
  setStorageSizeGi(sizeGi: number): void {
    this.findStorageSizeInput().type(`{selectall}${sizeGi}`);
    this.findStorageSizeInput().should('have.value', String(sizeGi));
  }

  findExistingPVCSelect(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findScope().findByTestId('nim-existing-pvc-select');
  }

  findExistingPVCInput(): Cypress.Chainable<JQuery<HTMLInputElement>> {
    return this.findExistingPVCSelect().find('input');
  }

  selectExistingPVC(name: string): void {
    this.findExistingPVCInput().click();
    cy.findByRole('option', { name }).click();
  }
}
