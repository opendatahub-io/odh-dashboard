import { DeleteModal } from './components/DeleteModal';
import { Modal } from './components/Modal';
import { TableRow } from './components/table';

class TierTableRow extends TableRow {
  findName(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Name"]');
  }

  findDescription(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Name"]').findByTestId('table-row-title-description');
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

  findEditButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findKebabAction('Edit tier');
  }

  findViewDetailsButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findKebabAction('View details');
  }
}

class TiersPage {
  visit(): void {
    cy.visitWithLogin('/maas/tiers/?devFeatureFlags=modelAsService=true');
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

  findDeleteButton() {
    return cy.findByRole('menuitem', { name: 'Delete tier' });
  }

  findEditButton(name: string) {
    return this.getRow(name).findKebabAction('Edit tier');
  }
}

class CreateTierPage {
  visit(): void {
    cy.visitWithLogin('/maas/tiers/create');
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

  findLevelMinusButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('tier-level').findByRole('button', { name: 'Minus' });
  }

  findLevelPlusButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('tier-level').findByRole('button', { name: 'Plus' });
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

  findTokenRateLimitPlusButton(index: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy
      .findByTestId(`tier-token-rate-limit-${index}-count`)
      .findByRole('button', { name: 'Plus' });
  }

  findTokenRateLimitMinusButton(index: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy
      .findByTestId(`tier-token-rate-limit-${index}-count`)
      .findByRole('button', { name: 'Minus' });
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

  findRequestRateLimitPlusButton(index: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy
      .findByTestId(`tier-request-rate-limit-${index}-count`)
      .findByRole('button', { name: 'Plus' });
  }

  findRequestRateLimitMinusButton(index: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy
      .findByTestId(`tier-request-rate-limit-${index}-count`)
      .findByRole('button', { name: 'Minus' });
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
    cy.visitWithLogin(`/maas/tiers/${name}`);
    this.wait();
  }

  private wait(): void {
    cy.findByTestId('tier-details-page').should('exist');
    cy.testA11y();
  }

  findName(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('tier-name-value');
  }

  findDescription(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('tier-description-value');
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

  findActionsEditButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('edit-tier-action');
  }

  findActionsDeleteButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('delete-tier-action');
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

  selectMaaSTierOption(option: string) {
    this.findMaaSTierDropdown().click();
    return cy.findByRole('option', { name: option }).click();
  }

  findMaaSTierNamesInput() {
    return cy.findByTestId('maas/save-as-maas-checkbox-tier-names');
  }

  findMaaSTierNamesOption(tierName: string) {
    return cy.findByRole('option', { name: tierName });
  }

  selectMaaSTierNames(tierNames: string[]) {
    this.findMaaSTierNamesInput().click();
    tierNames.forEach((tierName) => {
      this.findMaaSTierNamesOption(tierName).click();
    });
    // Close the dropdown by pressing escape
    cy.get('body').type('{esc}');
  }

  findMaaSTierChipGroup() {
    return this.findMaaSTierNamesInput()
      .parent()
      .findByRole('list', { name: 'Current selections' });
  }

  findMaaSTierChip(tierName: string) {
    return this.findMaaSTierChipGroup().find('li').contains('span', tierName);
  }
}

class APIKeysPage {
  visit(): void {
    cy.visitWithLogin('/maas/tokens');
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
    return cy.findByTestId('api-keys-table');
  }

  getRow(name: string): APIKeyTableRow {
    return new APIKeyTableRow(() =>
      this.findTable().find('tbody tr').contains('td', name).parents('tr'),
    );
  }

  findRows(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findTable().find('tbody tr');
  }

  findActionsToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('api-keys-actions');
  }

  findRevokeAllAPIKeysAction(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('revoke-all-api-keys-action');
  }

  findRevokeAllAPIKeysActionButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findRevokeAllAPIKeysAction().findByRole('menuitem');
  }

  findEmptyTableState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('dashboard-empty-table-state');
  }

  findCreateApiKeyButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('create-api-key-button');
  }

  findStatusFilterToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('api-key-status-filter-toggle');
  }

  findStatusFilterOption(status: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('menuitem', { name: new RegExp(status, 'i') });
  }

  findStatusFilterOptionCheckbox(status: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findStatusFilterOption(status).findByRole('checkbox');
  }

  findToolbar(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('api-keys-toolbar');
  }

  clearAllFilters() {
    this.findToolbar().contains('button', 'Clear all filters').click();
  }

  findColumnSortButton(columnLabel: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findTable().find('thead').contains('th', columnLabel).findByRole('button');
  }

  findFilterInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('username-filter-input');
  }

  findFilterSearchButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findFilterInput().find('button[type="submit"]');
  }

  findUsernameFilterTooltip(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('username-filter-tooltip');
  }

  findRevokeActionsButton(rowName: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.getRow(rowName).findKebabAction('Revoke');
  }
}

class APIKeyTableRow extends TableRow {
  findName(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Name"]');
  }

  findDescription(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('table-row-title-description');
  }

  findStatus(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Status"]');
  }

  findSubscription(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Subscription"]');
  }

  findSubscriptionPopoverButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findSubscription().findByTestId('subscription-popover-button');
  }

  findCreationDate(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Created"]');
  }

  findExpirationDate(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Expires"]');
  }
}

class SubscriptionPopover {
  findBody(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('subscription-popover-body');
  }

  findModelCount(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findBody().contains(/\d+ models?/);
  }

  findModelName(name: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findBody().contains(name);
  }
}

export const subscriptionPopover = new SubscriptionPopover();

class BulkRevokeAPIKeyModal extends Modal {
  constructor() {
    super('Revoke all API keys?');
  }

  findRevokeButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('revoke-keys-button');
  }

  findRevokeConfirmationInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('revoke-confirmation-input');
  }
}

class RevokeAPIKeyModal extends Modal {
  constructor() {
    super('Revoke API key?');
  }

  findRevokeAllButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('button', { name: 'Permanently revoke all keys' });
  }

  findRevokeButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('button', { name: 'Revoke' });
  }

  findRevokeConfirmationInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('delete-modal-input');
  }
}

class CreateApiKeyModal extends Modal {
  constructor() {
    super('Create API key');
  }

  find(): Cypress.Chainable<JQuery<HTMLElement>> {
    // Find the dialog that contains the API key name input (unique to this modal)
    return cy.findByTestId('api-key-name-input').closest('[role="dialog"]');
  }

  shouldBeOpen(open = true): void {
    if (open) {
      this.find().should('be.visible');
    } else {
      this.find().should('not.exist');
    }
  }

  findNameInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('api-key-name-input');
  }

  findDescriptionInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('api-key-description-input');
  }

  findExpirationToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('api-key-expiration-toggle');
  }

  findExpirationOption(value: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(`api-key-expiration-option-${value}`);
  }

  findCustomDaysInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('api-key-custom-days-input');
  }

  findSubmitButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('submit-create-api-key-button');
  }

  findErrorAlert(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('create-api-key-error-alert');
  }

  findSubscriptionToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('api-key-subscription-toggle');
  }

  findSubscriptionOption(value: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(`api-key-subscription-option-${value}`);
  }

  findSubscriptionCostCenterDetails(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('subscription-cost-center-details');
  }

  findSubscriptionCostCenter(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('subscription-cost-center');
  }

  findSubscriptionModelsTable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('subscription-models-table');
  }

  findSubscriptionModelRateLimit(modelName: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find()
      .findByTestId('subscription-models-table')
      .contains('tr', modelName)
      .find('[data-label="Token limits"]');
  }

  findNoSubscriptionsAlert(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('no-subscriptions-alert');
  }

  findSubscriptionsErrorAlert(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('subscriptions-error-alert');
  }
}

class CopyApiKeyModal extends Modal {
  constructor() {
    super('API key created');
  }

  find(): Cypress.Chainable<JQuery<HTMLElement>> {
    // Find the dialog that contains the API key token copy (unique to this modal)
    return cy.findByTestId('api-key-token-copy-section').closest('[role="dialog"]');
  }

  shouldBeOpen(open = true): void {
    if (open) {
      this.find().should('be.visible');
    } else {
      this.find().should('not.exist');
    }
  }

  findApiKeyTokenCopy(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('api-key-token-copy-section');
  }

  findApiKeyTokenCopyButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('api-key-token-copy-button');
  }

  findApiKeyTokenInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    // input/textarea holds the value; PF wraps TextInput in a span, value on the span is undefined).
    return this.find().find('input[aria-label="API key"], textarea[aria-label="API key"]');
  }

  findApiKeyTokenVisibilityToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('api-key-visibility-toggle');
  }

  findApiKeyName(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('api-key-display-name');
  }

  findApiKeyExpirationDate(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('api-key-display-expiration');
  }

  findCloseButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('close-api-key-button');
  }
}

class AdminBulkRevokeAPIKeyModal extends Modal {
  constructor() {
    super('Revoke user API keys?');
  }

  findUsernameInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('admin-revoke-username-input');
  }

  findSearchButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('admin-revoke-search-button');
  }

  findRevokeButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('admin-revoke-keys-button');
  }

  findNoKeysAlert(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('admin-revoke-no-keys-alert');
  }

  findKeysFoundHeading(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('admin-revoke-keys-found-alert');
  }

  findSearchError(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('admin-revoke-search-error');
  }

  findRevokeError(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('admin-revoke-error-alert');
  }
}

class SubscriptionsPage {
  visit(): void {
    cy.visitWithLogin('/maas/subscriptions');
    this.wait();
  }

  reload(): void {
    cy.reload();
    this.wait();
    this.findTable().should('exist');
  }

  private wait(): void {
    cy.findByTestId('app-page-title').should('exist');
    cy.testA11y();
  }

  findTable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('subscriptions-table');
  }

  findRows(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findTable().find('tbody tr');
  }

  findActionsToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('subscription-actions');
  }

  getRow(name: string): SubscriptionTableRow {
    return new SubscriptionTableRow(() =>
      this.findTable().find('tbody tr').contains('td', name).parents('tr'),
    );
  }

  findTitle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('app-page-title');
  }

  findDescription(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('app-page-description');
  }

  findFilterInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('subscriptions-filter-input');
  }

  findFilterResetButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('button', { name: 'Clear all filters' });
  }

  findCreateSubscriptionButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('create-subscription-button');
  }

  findEmptyState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('empty-state-title');
  }

  findViewDetailsButton(rowName: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.getRow(rowName).findKebabAction('View details');
  }

  findEditButton(rowName: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.getRow(rowName).findKebabAction('Edit');
  }

  findDeleteButton(rowName: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.getRow(rowName).findKebabAction('Delete');
  }
}

class SubscriptionTableRow extends TableRow {
  findName(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Name"]');
  }

  findActionsToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByLabelText('Kebab toggle');
  }

  findTitleButton(): Cypress.Chainable<JQuery<HTMLAnchorElement>> {
    return this.find().findByTestId('table-row-title').find('a');
  }

  findPhase(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Phase"]');
  }

  findPhaseLabel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findPhase().findByTestId('phase-label');
  }

  findPhasePopover(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('phase-popover');
  }

  findGroups(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Groups"]');
  }

  findModels(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Models"]');
  }

  findPriority(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Priority"]');
  }
}

class CreateSubscriptionPage {
  visit(): void {
    cy.visitWithLogin('/maas/subscriptions/create');
    this.wait();
  }

  private wait(): void {
    cy.findByTestId('app-page-title').should('exist');
    cy.testA11y();
  }

  findTitle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('app-page-title');
  }

  findDisplayNameInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('subscription-name-desc-name');
  }

  findDescriptionInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('subscription-name-desc-description');
  }

  findPriorityInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('subscription-priority').find('input[type="number"]');
  }

  findPriorityPlusButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('subscription-priority').findByRole('button', { name: 'Plus' });
  }

  findPriorityMinusButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('subscription-priority').findByRole('button', { name: 'Minus' });
  }

  findPriorityValidationError(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy
      .findByTestId('subscription-priority')
      .parents('.pf-v6-c-form__group')
      .find('.pf-v6-c-helper-text__item');
  }

  findGroupsSelect(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('subscription-groups');
  }

  selectGroup(name: string): void {
    this.findGroupsSelect().click();
    cy.findByRole('option', { name }).click();
    this.findGroupsSelect().click();
  }

  typeCustomGroup(name: string): void {
    this.findGroupsSelect().find('input').type(name);
    cy.findByRole('option', { name: `Add group "${name}"` }).click();
    this.findGroupsSelect().click();
  }

  selectCustomGroup(name: string): void {
    this.findGroupsSelect().find('input').type(name);
    cy.findByTestId(`select-multi-typeahead-${name}`).click();
    this.findGroupsSelect().click();
  }

  findAddModelsButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('add-models-button');
  }

  findModelsTable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('subscription-models-table');
  }

  findAuthPolicyCheckbox(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('subscription-create-auth-policy');
  }

  findCreateButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('create-subscription-button');
  }

  findCancelButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('cancel-subscription-button');
  }

  addTokenRateLimit(index: number): void {
    this.findModelsTable().findByTestId(`add-token-limit-${index}`).click();
  }
}

class EditSubscriptionPage {
  visit(name: string): void {
    cy.visitWithLogin(`/maas/subscriptions/edit/${name}`);
    this.wait();
  }

  private wait(): void {
    cy.findByTestId('app-page-title').should('exist');
    cy.testA11y();
  }

  findTitle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('app-page-title');
  }

  findNameInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('subscription-name-desc-name');
  }

  findDescriptionInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('subscription-name-desc-description');
  }

  findPriorityInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('subscription-priority').find('input[type="number"]');
  }

  findGroupsSelect(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('subscription-groups');
  }

  selectGroup(name: string): void {
    this.findGroupsSelect().click();
    cy.findByRole('option', { name }).click();
    this.findGroupsSelect().click();
  }

  findModelsTable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('subscription-models-table');
  }

  findAddModelsButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('add-models-button');
  }

  findPolicyChangeWarning(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('policy-change-warning');
  }

  typeCustomGroup(name: string): void {
    this.findGroupsSelect().find('input').type(name);
    cy.findByRole('option', { name: `Add group "${name}"` }).click();
    this.findGroupsSelect().click();
  }

  findSaveButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('update-subscription-button');
  }

  findCancelButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('cancel-subscription-button');
  }

  findSubmitError(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByText('Failed to update subscription');
  }
}

class AddModelsToSubscriptionModal extends Modal {
  constructor() {
    super('Add models');
  }

  find(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('add-models-modal');
  }

  findFilterInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('add-models-filter');
  }

  findTable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('add-models-table');
  }

  findToggleModelButton(modelName: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId(`toggle-model-${modelName}`);
  }

  findConfirmButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('confirm-add-models');
  }
}

class EditRateLimitsModal extends Modal {
  constructor() {
    super(/Edit subscription token limits/);
  }

  find(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('dialog', { name: /Edit subscription token limits/ });
  }

  findCountInput(index: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId(`edit-token-limit-${index}-count`).find('input[type="number"]');
  }

  findTimeInput(index: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId(`edit-token-limit-${index}-time`).find('input[type="number"]');
  }

  findUnitDropdown(index: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId(`edit-token-limit-${index}-unit`);
  }

  selectUnit(index: number, unit: string): void {
    this.findUnitDropdown(index).click();
    cy.findByRole('menuitem', { name: unit }).click();
  }

  findSaveButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('save-rate-limits');
  }

  findHelperText(index: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId(`edit-token-limit-${index}-helper-text`);
  }
}

class DeleteSubscriptionModal extends DeleteModal {
  constructor() {
    super('Delete Subscription?');
  }

  findInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByLabelText('Delete modal input');
  }

  findSubmitButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('button', { name: /Delete/, hidden: true });
  }
}
class ViewSubscriptionPage {
  visit(name: string): void {
    cy.visitWithLogin(`/maas/subscriptions/view/${name}`);
    this.wait();
  }

  private wait(): void {
    cy.findByTestId('app-page-title').should('exist');
    cy.testA11y();
  }

  findTitle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('app-page-title');
  }

  findBreadcrumb(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('app-page-breadcrumb');
  }

  findBreadcrumbSubscriptionsLink(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('breadcrumb-subscriptions-link');
  }

  findDetailsSection(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('subscription-details-section');
  }

  findGroupsSection(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('subscription-groups-section');
  }

  findGroupsTable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('subscription-groups-table');
  }

  findModelsSection(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('subscription-models-section');
  }

  findModelsTable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('subscription-models-table');
  }

  findPageError(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('error-empty-state-body');
  }

  findDetailsTab(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('subscription-details-tab');
  }

  findActionsToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('subscription-actions-toggle');
  }

  findDeleteActionButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('menuitem', { name: 'Delete' });
  }

  findEditActionButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('menuitem', { name: 'Edit' });
  }
}

class PolicyPage {
  visit(policyName?: string): void {
    const path = policyName
      ? `/maas/auth-policies/edit/${encodeURIComponent(policyName)}`
      : '/maas/auth-policies/create';
    cy.visitWithLogin(path);
    this.wait();
  }

  private wait(): void {
    cy.findByTestId('app-page-title').should('exist');
    cy.testA11y();
  }

  findTitle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('app-page-title');
  }

  findDisplayNameInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('policy-name-desc-name');
  }

  findDescriptionInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('policy-name-desc-description');
  }

  findGroupsSelect(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('policy-groups');
  }

  selectGroup(name: string): void {
    this.findGroupsSelect().click();
    cy.findByRole('option', { name }).click();
    this.findGroupsSelect().click();
  }

  findAddModelsButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('policy-add-models-button');
  }

  findAddModelsModal(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('add-models-modal');
  }

  findToggleModelInModal(modelName: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findAddModelsModal().findByTestId(`toggle-model-${modelName}`);
  }

  findConfirmAddModelsButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findAddModelsModal().findByTestId('confirm-add-models');
  }

  findModelsTable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('policy-models-table');
  }

  findCancelButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('policy-cancel-button');
  }

  findSubmitButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('policy-submit-button');
  }
}

class AuthPoliciesPage {
  visit(): void {
    cy.visitWithLogin('/maas/auth-policies');
    this.wait();
  }

  private wait(): void {
    cy.findByTestId('app-page-title').should('exist');
    cy.testA11y();
  }

  findTitle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('app-page-title');
  }

  findTable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('auth-policies-table');
  }

  findRows(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findTable().find('tbody tr');
  }

  findCreateAuthPolicyButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('create-auth-policy-button');
  }

  findActionsToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('auth-policy-actions');
  }

  getRow(name: string): AuthPolicyTableRow {
    return new AuthPolicyTableRow(() =>
      this.findTable().find('tbody tr').contains('td', name).parents('tr'),
    );
  }

  findEmptyState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('empty-state-title');
  }

  findKeywordFilterInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('auth-policies-filter-name-input');
  }

  clearAllFilters(): void {
    cy.findByRole('button', { name: 'Clear all filters' }).click();
  }
}

class AuthPolicyTableRow extends TableRow {
  findName(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Name"]');
  }

  findPhase(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Phase"]');
  }

  findPhaseLabel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findPhase().findByTestId('phase-label');
  }

  findPhasePopover(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('phase-popover');
  }

  findGroups(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Groups"]');
  }

  findModels(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Models"]');
  }

  findActionsToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByLabelText('Kebab toggle');
  }

  findTitleButton(): Cypress.Chainable<JQuery<HTMLAnchorElement>> {
    return this.find().findByTestId('table-row-title').find('a');
  }
}

class DeleteAuthPolicyModal extends DeleteModal {
  constructor() {
    super('Delete Auth Policy?');
  }

  findInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByLabelText('Delete modal input');
  }

  findSubmitButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('button', { name: /Delete/, hidden: true });
  }
}

class ViewAuthPolicyPage {
  visit(name: string): void {
    cy.visitWithLogin(`/maas/auth-policies/view/${name}`);
    this.wait();
  }

  private wait(): void {
    cy.findByTestId('app-page-title').should('exist');
    cy.testA11y();
  }

  findTitle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('app-page-title');
  }

  findBreadcrumbPoliciesLink(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('breadcrumb-policies-link');
  }

  findDetailsTab(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('policy-details-tab');
  }

  findDetailsSection(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('policy-details-section');
  }

  findGroupsSection(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('policy-groups-section');
  }

  findGroupsTable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('policy-groups-table');
  }

  findModelsSection(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('subscription-models-section');
  }

  findModelsTable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('subscription-models-table');
  }

  findActionsToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('policy-actions-toggle');
  }

  findDeleteActionButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('menuitem', { name: 'Delete' });
  }

  findEditActionButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('menuitem', { name: 'Edit' });
  }

  findPageError(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('error-empty-state-body');
  }
}

export const tiersPage = new TiersPage();
export const createTierPage = new CreateTierPage();
export const deleteTierModal = new DeleteTierModal();
export const maasWizardField = new MaaSWizardField();
export const tierDetailsPage = new TierDetailsPage();
export const apiKeysPage = new APIKeysPage();
export const bulkRevokeAPIKeyModal = new BulkRevokeAPIKeyModal();
export const adminBulkRevokeAPIKeyModal = new AdminBulkRevokeAPIKeyModal();
export const revokeAPIKeyModal = new RevokeAPIKeyModal();
export const createApiKeyModal = new CreateApiKeyModal();
export const copyApiKeyModal = new CopyApiKeyModal();
export const subscriptionsPage = new SubscriptionsPage();
export const deleteSubscriptionModal = new DeleteSubscriptionModal();
export const viewSubscriptionPage = new ViewSubscriptionPage();
export const createSubscriptionPage = new CreateSubscriptionPage();
export const addModelsToSubscriptionModal = new AddModelsToSubscriptionModal();
export const editRateLimitsModal = new EditRateLimitsModal();
export const editSubscriptionPage = new EditSubscriptionPage();
export const policyPage = new PolicyPage();
export const authPoliciesPage = new AuthPoliciesPage();
export const deleteAuthPolicyModal = new DeleteAuthPolicyModal();
export const viewAuthPolicyPage = new ViewAuthPolicyPage();
