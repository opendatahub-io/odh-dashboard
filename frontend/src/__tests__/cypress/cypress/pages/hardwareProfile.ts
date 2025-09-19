import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';
import { K8sNameDescriptionField } from '#~/__tests__/cypress/cypress/pages/components/subComponents/K8sNameDescriptionField';
import { Modal } from '#~/__tests__/cypress/cypress/pages/components/Modal';
import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';
import { TableRow } from './components/table';

class HardwareProfileTableToolbar extends Contextual<HTMLElement> {
  findToggleButton(id: string) {
    return this.find().pfSwitch(id).click();
  }

  findFilterMenuOption(id: string, name: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findToggleButton(id).parents().findByRole('menuitem', { name });
  }

  findFilterInput(name: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByLabelText(`Filter by ${name}`);
  }

  findSearchInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('filter-toolbar-text-field');
  }

  selectEnableFilter(name: string) {
    this.find()
      .findByTestId('hardware-profile-filter-enable-select')
      .findSelectOption(name)
      .click();
  }
}

class HardwareProfileWarningBanner extends Contextual<HTMLElement> {
  findTitle(title: string) {
    return this.find().contains(title);
  }

  findDescription(description: string) {
    return this.find().contains(description);
  }
}

class HardwareProfileRow extends TableRow {
  findDescription() {
    return this.find().findByTestId('table-row-title-description');
  }

  findEnabled() {
    return this.find().pfSwitchValue('enable-switch');
  }

  findEnableSwitch() {
    return this.find().pfSwitch('enable-switch');
  }

  findExpandableSection() {
    return this.find().parent().find('[data-label="Other information"]');
  }

  findNodeResourceTable() {
    return this.findExpandableSection().findByTestId('hardware-profile-node-resources-table');
  }

  findNodeSelectorTable() {
    return this.findExpandableSection().findByTestId('hardware-profile-node-selectors-table');
  }

  findWarningIconButton() {
    return this.find().findByTestId('icon-warning');
  }

  findTolerationTable() {
    return this.findExpandableSection().findByTestId('hardware-profile-tolerations-table');
  }
}

class HardwareProfile {
  visit() {
    cy.visitWithLogin('/hardwareProfiles');
    this.wait();
  }

  navigate() {
    this.findNavItem().click();
    this.wait();
  }

  findNavItem() {
    return appChrome.findNavItem('Hardware profiles', 'Settings');
  }

  getCell(rowIndex: number, columnIndex: number) {
    return this.findTable()
      .children('tbody')
      .eq(rowIndex)
      .find('tr')
      .eq(0)
      .find('td')
      .eq(columnIndex);
  }

  getLabelsFromCell(rowIndex: number, columnIndex: number) {
    const labels: string[] = [];

    return this.getCell(rowIndex, columnIndex)
      .find('[data-testid^="label-"]')
      .each((el) => {
        labels.push(el.text().trim());
      })
      .then(() => labels);
  }

  getFeatureLabels(rowIndex: number) {
    return this.getLabelsFromCell(rowIndex, 2);
  }

  private wait() {
    this.findAppPage();
    cy.testA11y();
  }

  private findAppPage() {
    return cy.findByTestId('app-page-title');
  }

  findTableHeaderButton(name: string) {
    return this.findTable().find('thead').findByRole('button', { name });
  }

  findHardwareProfileBanner() {
    return new HardwareProfileWarningBanner(() => this.findHardwareProfileDisabledBanner());
  }

  findTable() {
    return cy.findByTestId('hardware-profile-table');
  }

  findUniqueTable() {
    return cy.get('[data-testid="hardware-profile-table"]').first();
  }

  private findHardwareProfileDisabledBanner() {
    return cy.findByTestId('hardware-profiles-error-alert');
  }

  getUniqueRow(name: string) {
    return new HardwareProfileRow(() =>
      this.findUniqueTable().find(`[data-label=Name]`).contains(name).parents('tr'),
    );
  }

  getRow(name: string) {
    return new HardwareProfileRow(() =>
      this.findUniqueTable().find(`[data-label=Name]`).contains(name).parents('tr'),
    );
  }

  findRows() {
    return this.findTable().find(`[data-label=Name]`);
  }

  getTableToolbar() {
    return new HardwareProfileTableToolbar(() =>
      cy.findByTestId('hardware-profiles-table-toolbar'),
    );
  }

  findCreateButton() {
    // Use Cypress's built-in handling to try one selector, then another if the first fails
    return cy.get('body').then(() =>
      cy
        .get(
          '[data-testid="display-hardware-modal-button"], [data-testid="create-hardware-profile"]',
        )
        .first()
        .then(($el) => cy.wrap($el)),
    );
  }

  getUniqueTableToolbar() {
    return new HardwareProfileTableToolbar(() =>
      // This approach will get all matching elements, then return the first one that's visible
      cy.get('[data-testid="hardware-profiles-table-toolbar"]').then(($elements) => {
        // Return the first element that's visible
        const visibleElements = $elements.filter(':visible');
        if (visibleElements.length > 0) {
          return cy.wrap(visibleElements.first());
        }
        // Fallback to the first element if none are visible
        return cy.wrap($elements.first());
      }),
    );
  }

  findClearFiltersButton() {
    return cy.findByTestId('clear-filters-button');
  }

  findRestoreDefaultHardwareProfileButton() {
    return cy.findByTestId('restore-default-hardware-profile');
  }

  findHardwareProfilesEmptyState() {
    return cy.findByTestId('dashboard-empty-table-state');
  }

  findHardwareProfilesCreateButton() {
    return cy.findByTestId('display-hardware-modal-button');
  }

  findHardwareProfilePageEmptyState() {
    return cy.findByTestId('empty-state-hardware-profiles');
  }

  findNoProfilesAvailableText() {
    return cy.findByTestId('no-available-hardware-profiles');
  }
}

class NodeResourceRow extends TableRow {
  shouldHaveResourceLabel(name: string) {
    this.find().find(`[data-label="Resource name"]`).should('have.text', name);
    return this;
  }

  shouldHaveResourceIdentifier(name: string) {
    this.find().find(`[data-label="Resource identifier"]`).should('have.text', name);
    return this;
  }

  findEditAction() {
    return this.find().findByRole('button', { name: 'Edit node resource' });
  }

  findDeleteAction() {
    return this.find().findByRole('button', { name: 'Remove node resource' });
  }
}

class NodeSelectorRow extends TableRow {
  shouldHaveKey(name: string) {
    this.find().find(`[data-label=Key]`).should('have.text', name);
    return this;
  }

  shouldHaveValue(name: string) {
    this.find().find(`[data-label=Value]`).should('have.text', name);
    return this;
  }

  findEditAction() {
    return this.find().findByRole('button', { name: 'Edit node selector' });
  }

  findDeleteAction() {
    return this.find().findByRole('button', { name: 'Remove node selector' });
  }
}

class TolerationRow extends TableRow {
  shouldHaveOperator(name: string) {
    this.find().find(`[data-label=Operator]`).should('have.text', name);
    return this;
  }

  shouldHaveEffect(name: string) {
    this.find().find(`[data-label=Effect]`).should('have.text', name);
    return this;
  }

  shouldHaveTolerationSeconds(toleration: string) {
    this.find().find(`[data-label="Toleration seconds"]`).should('have.text', toleration);
    return this;
  }

  findEditAction() {
    return this.find().findByRole('button', { name: 'Edit toleration' });
  }

  findDeleteAction() {
    return this.find().findByRole('button', { name: 'Remove toleration' });
  }
}

class ManageHardwareProfile {
  k8sNameDescription = new K8sNameDescriptionField('hardware-profile-name-desc');

  findDescriptionTextBox() {
    return cy.findByTestId('hardware-profile-name-desc-description');
  }

  findAddTolerationButton() {
    return cy.findByTestId('add-toleration-button');
  }

  findAddNodeSelectorButton() {
    return cy.findByTestId('add-node-selector-button');
  }

  findAddNodeResourceButton() {
    return cy.findByTestId('add-node-resource-button');
  }

  findSubmitButton() {
    return cy.findByTestId('hardware-profile-create-button');
  }

  findTolerationTable() {
    return cy.findByTestId('hardware-profile-tolerations-table');
  }

  findNodeSelectorTable() {
    return cy.findByTestId('hardware-profile-node-selectors-table');
  }

  findNodeResourceTable() {
    return cy.findByTestId('hardware-profile-node-resources-table');
  }

  findNodeResourceTableAlert() {
    return cy.findByTestId('node-resource-table-alert');
  }

  findNodeResourceDeletionDialog() {
    return cy.findByTestId('delete-node-resource-modal');
  }

  findNodeResourceDeletionDialogDeleteButton() {
    return cy.findByTestId('delete-node-resource-modal-delete-btn');
  }

  findNodeResourceDeletionDialogCancelButton() {
    return cy.findByTestId('delete-node-resource-modal-cancel-btn');
  }

  findLocalQueueRadio() {
    return cy.findByTestId('local-queue-radio-input');
  }

  findNodeStrategyRadio() {
    return cy.findByTestId('node-strategy-radio-input');
  }

  findLocalQueueInput() {
    return cy.findByTestId('local-queue-input');
  }

  findWorkloadPrioritySelect() {
    return cy.findByTestId('workload-priority-select');
  }

  selectWorkloadPriority(name: string) {
    this.findWorkloadPrioritySelect().click();
    cy.findByTestId(name).click();
  }

  findKueueDisabledAlert() {
    return cy.findByTestId('kueue-disabled-alert').scrollIntoView();
  }

  findKueueDisabledTooltip() {
    return cy.findByTestId('kueue-disabled-tooltip');
  }

  getTolerationTableRow(name: string) {
    return new TolerationRow(() =>
      this.findTolerationTable().find(`[data-label=Key]`).contains(name).parents('tr'),
    );
  }

  getNodeSelectorTableRow(name: string) {
    return new NodeSelectorRow(() =>
      this.findNodeSelectorTable().find(`[data-label=Key]`).contains(name).parents('tr'),
    );
  }

  getNodeResourceTableRow(name: string) {
    return new NodeResourceRow(() =>
      this.findNodeResourceTable()
        .find(`[data-label="Resource identifier"]`)
        .contains(name)
        .parents('tr'),
    );
  }

  hasNodeResourceRow(name: string): Cypress.Chainable<boolean> {
    // Use .then to transform the result into a boolean
    return cy.document().then(() =>
      // Create a wrapped jQuery selector that won't fail if the element doesn't exist
      cy.wrap(
        Cypress.$(
          `[data-testid="hardware-profile-node-resources-table"] [data-label="Resource identifier"]:contains("${name}")`,
        ).length > 0,
      ),
    );
  }
}

class CreateHardwareProfile extends ManageHardwareProfile {
  visit(identifiers?: string) {
    cy.visitWithLogin(
      identifiers
        ? `/hardwareProfiles/create${`?identifiers=${identifiers}`}`
        : '/hardwareProfiles/create',
    );
    this.wait();
  }

  private wait() {
    this.findSubmitButton().contains('Create hardware profile');
    cy.testA11y();
  }
}

class EditHardwareProfile extends ManageHardwareProfile {
  visit(name: string) {
    cy.visitWithLogin(`/hardwareProfiles/edit/${name}`);
    cy.testA11y();
  }

  findMigrationAlert() {
    return cy.findByTestId('migration-alert');
  }

  findErrorText() {
    return cy.findByTestId('problem-loading-hardware-profile');
  }

  findViewAllHardwareProfilesButton() {
    return cy.findByTestId('view-all-hardware-profiles');
  }
}

class DuplicateHardwareProfile extends ManageHardwareProfile {
  visit(name: string) {
    cy.visitWithLogin(`/hardwareProfiles/duplicate/${name}`);
    cy.testA11y();
  }

  findErrorText() {
    return cy.findByTestId('problem-loading-hardware-profile');
  }

  findViewAllHardwareProfilesButton() {
    return cy.findByTestId('view-all-hardware-profiles');
  }
}

class TolerationModal extends Modal {
  constructor(edit = false) {
    super(edit ? 'Edit toleration' : 'Add toleration');
  }

  findTolerationKeyInput() {
    return this.find().findByTestId('toleration-key-input');
  }

  findTolerationValueAlert() {
    return this.find().findByTestId('toleration-value-alert');
  }

  findTolerationSecondRadioCustom() {
    return this.find().findByTestId('toleration-seconds-radio-custom');
  }

  findTolerationSecondAlert() {
    return this.find().findByTestId('toleration-seconds-alert');
  }

  findTolerationValueInput() {
    return this.find().findByTestId('toleration-value-input');
  }

  private findTolerationOperatorSelect() {
    return this.find().findByTestId('toleration-operator-select');
  }

  private findTolerationEffectSelect() {
    return this.find().findByTestId('toleration-effect-select');
  }

  findOperatorOptionExist() {
    return this.findTolerationOperatorSelect().findSelectOption(
      'Exists A toleration "matches" a taint if the keys are the same and the effects are the same. No value should be specified.',
    );
  }

  findOperatorOptionEqual() {
    return this.findTolerationOperatorSelect().findSelectOption(
      'Equal A toleration "matches" a taint if the keys are the same, the effects are the same, and the values are equal.',
    );
  }

  findEffectOptionNoExecute() {
    return this.findTolerationEffectSelect().findSelectOption(
      'NoExecute Pods will be evicted from the node if they do not tolerate the taint.',
    );
  }

  findPlusButton() {
    return this.find().findByRole('button', { name: 'Plus' });
  }

  findTolerationSubmitButton() {
    return this.find().findByTestId('modal-submit-button');
  }
}

class NodeSelectorModal extends Modal {
  constructor(edit = false) {
    super(edit ? 'Edit node selector' : 'Add node selector');
  }

  findNodeSelectorKeyInput() {
    return this.find().findByTestId('node-selector-key-input');
  }

  findNodeSelectorValueInput() {
    return this.find().findByTestId('node-selector-value-input');
  }

  findNodeSelectorSubmitButton() {
    return this.find().findByTestId('modal-submit-button');
  }
}

class NodeResourceModal extends Modal {
  constructor(edit = false) {
    super(edit ? 'Edit node resource' : 'Add node resource');
  }

  findNodeResourceLabelInput() {
    return this.find().findByTestId('node-resource-name-input');
  }

  findNodeResourceIdentifierInput() {
    return this.find().findByTestId('node-resource-identifier-input');
  }

  findNodeResourceTypeSelect() {
    return this.find().findByTestId('node-resource-type-select');
  }

  findNodeResourceExistingErrorMessage() {
    return this.find().findByTestId('resource-identifier-error');
  }

  findNodeResourceDefaultInput() {
    return this.find().findByTestId('node-resource-size-default').findByLabelText('Input');
  }

  selectNodeResourceDefaultUnit(name: string) {
    this.find()
      .findByTestId('node-resource-size-default')
      .findByTestId('value-unit-select')
      .findDropdownItem(name)
      .click();
  }

  findNodeResourceDefaultErrorMessage() {
    return this.find().findByTestId('node-resource-size-default-error');
  }

  findNodeResourceMinInput() {
    return this.find().findByTestId('node-resource-size-minimum-allowed').findByLabelText('Input');
  }

  findNodeResourceMinErrorMessage() {
    return this.find().findByTestId('node-resource-size-minimum-allowed-error');
  }

  findNodeResourceMaxInput() {
    return this.find().findByTestId('node-resource-size-maximum-allowed').findByLabelText('Input');
  }

  findNodeResourceSubmitButton() {
    return this.find().findByTestId('modal-submit-button');
  }
}

export const hardwareProfile = new HardwareProfile();
export const createHardwareProfile = new CreateHardwareProfile();
export const createTolerationModal = new TolerationModal(false);
export const editTolerationModal = new TolerationModal(true);
export const createNodeSelectorModal = new NodeSelectorModal(false);
export const editNodeSelectorModal = new NodeSelectorModal(true);
export const createNodeResourceModal = new NodeResourceModal(false);
export const editNodeResourceModal = new NodeResourceModal(true);
export const editHardwareProfile = new EditHardwareProfile();
export const duplicateHardwareProfile = new DuplicateHardwareProfile();
