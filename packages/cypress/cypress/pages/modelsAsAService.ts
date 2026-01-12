import { DeleteModal } from './components/DeleteModal';
import { TableRow } from './components/table';

class TierTableRow extends TableRow {
  findName(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Name"]');
  }

  findLevel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Level"]');
  }

  findGroups(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Groups"]');
  }

  findModels(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Models"]');
  }

  findLimits(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Limits"]');
  }

  findDeleteButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findKebabAction('Delete tier');
  }
}

class TiersPage {
  visit(): void {
    cy.visit('/maas/tiers');
    this.wait();
  }

  private wait(): void {
    cy.findByTestId('app-page-title').should('exist');
    cy.testA11y();
  }

  findTitle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('app-page-title');
  }

  findDescription(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('app-page-description');
  }

  findTable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('tiers-table');
  }

  findFilterInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('tiers-filter-input');
  }

  findFilterResetButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findFilterInput().find('button[aria-label="Reset"]');
  }

  findCreateTierButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('create-tier-button');
  }

  getRow(name: string): TierTableRow {
    return new TierTableRow(() =>
      this.findTable().find('tbody tr').contains('td', name).parents('tr'),
    );
  }

  findRows(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findTable().find('tbody tr');
  }

  findEmptyState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('dashboard-empty-table-state');
  }

  findKebab(name: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.getRow(name).findKebab();
  }

  findViewDetailsButton() {
    return cy.findByRole('menuitem', { name: 'View details' });
  }
}

class CreateTierPage {
  visit(): void {
    cy.visit('/maas/tiers/create');
    this.wait();
  }

  private wait(): void {
    cy.findByTestId('create-tier-page').should('exist');
    cy.testA11y();
  }

  findTitle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('app-page-title');
  }

  findPageDescription(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('app-page-description');
  }

  // Name and Description fields (K8sNameDescriptionField)
  findNameInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('tier-name-desc-name');
  }

  findDescriptionInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('tier-name-desc-description');
  }

  // Level field
  findLevelInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('tier-level').find('input[type="number"]');
  }

  // Groups MultiSelection
  findGroupsSelectButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('tier-groups');
  }

  findGroupsOption(name: string) {
    return cy.findByRole('option', { name });
  }

  selectGroupsOption(name: string) {
    this.findGroupsSelectButton().click();
    this.findGroupsOption(name).click();
    this.findGroupsSelectButton().click();
  }

  // Token rate limit checkbox and controls
  findTokenRateLimitCheckbox(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('tier-token-rate-limit');
  }

  findTokenRateLimitAddButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('tier-token-rate-limit-add');
  }

  findTokenRateLimitCountInput(index: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(`tier-token-rate-limit-${index}-count`).find('input[type="number"]');
  }

  findTokenRateLimitTimeInput(index: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(`tier-token-rate-limit-${index}-time`).find('input[type="number"]');
  }

  findTokenRateLimitUnitSelect(index: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(`tier-token-rate-limit-${index}-unit`);
  }

  selectTokenRateLimitUnit(index: number, unit: string) {
    this.findTokenRateLimitUnitSelect(index).click();
    cy.findByRole('menuitem', { name: unit }).click();
  }

  findTokenRateLimitRemoveButton(index: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(`tier-token-rate-limit-${index}-remove`);
  }

  // Request rate limit checkbox and controls
  findRequestRateLimitCheckbox(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('tier-request-rate-limit');
  }

  findRequestRateLimitAddButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('tier-request-rate-limit-add');
  }

  findRequestRateLimitCountInput(index: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(`tier-request-rate-limit-${index}-count`).find('input[type="number"]');
  }

  findRequestRateLimitTimeInput(index: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(`tier-request-rate-limit-${index}-time`).find('input[type="number"]');
  }

  findRequestRateLimitUnitSelect(index: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(`tier-request-rate-limit-${index}-unit`);
  }

  selectRequestRateLimitUnit(index: number, unit: string) {
    this.findRequestRateLimitUnitSelect(index).click();
    cy.findByRole('menuitem', { name: unit }).click();
  }

  findRequestRateLimitRemoveButton(index: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(`tier-request-rate-limit-${index}-remove`);
  }

  findNameTakenError(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('resource-name-taken-error');
  }

  findLevelTakenError(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('tier-level-taken-error');
  }

  // Form action buttons
  findCreateButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('create-tier-button');
  }

  findUpdateButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('update-tier-button');
  }

  findCancelButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('cancel-tier-button');
  }
}

class TierDetailsPage {
  visit(name: string): void {
    cy.visit(`/maas/tiers/${name}`);
    this.wait();
  }

  private wait(): void {
    cy.findByTestId('tier-details-page').should('exist');
    cy.testA11y();
  }

  findLevel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('tier-level-value');
  }

  findGroups(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('tier-groups-value');
  }

  findLimits(name: string) {
    return cy.findByText(name);
  }

  findActionsButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('tier-actions');
  }
}

class DeleteTierModal extends DeleteModal {
  constructor() {
    super('Delete tier?');
  }
}

// MaaS Wizard Field helpers for the model deployment wizard
class MaaSWizardField {
  findSaveAsMaaSCheckbox() {
    return cy.findByTestId('maas/save-as-maas-checkbox');
  }

  findMaaSTierDropdown() {
    return cy.findByTestId('maas/save-as-maas-checkbox-tier-dropdown');
  }

  selectMaaSTierOption(
    option: 'All resource tiers' | 'No resource tiers' | 'Specific resource tiers',
  ) {
    this.findMaaSTierDropdown().click();
    return cy.findByRole('option', { name: option }).click();
  }

  findMaaSTierNamesInput() {
    return cy.findByTestId('maas/save-as-maas-checkbox-tier-names');
  }
}

export const tiersPage = new TiersPage();
export const createTierPage = new CreateTierPage();
export const deleteTierModal = new DeleteTierModal();
export const maasWizardField = new MaaSWizardField();
export const tierDetailsPage = new TierDetailsPage();
