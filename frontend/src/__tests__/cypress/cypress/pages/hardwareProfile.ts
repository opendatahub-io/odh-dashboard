import { Contextual } from '~/__tests__/cypress/cypress/pages/components/Contextual';
import { Modal } from './components/Modal';
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

  findTolerationTable() {
    return this.findExpandableSection().findByTestId('hardware-profile-tolerations-table');
  }
}

class HardwareProfile {
  visit() {
    cy.visitWithLogin('/hardwareProfiles');
    this.wait();
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

  private findTable() {
    return cy.findByTestId('hardware-profile-table');
  }

  getRow(name: string) {
    return new HardwareProfileRow(() =>
      this.findTable().find(`[data-label=Name]`).contains(name).parents('tr'),
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
    return cy.findByTestId('create-hardware-profile');
  }

  findClearFiltersButton() {
    return cy.findByTestId('clear-filters-button');
  }
}

class DisableHardwareProfileModal extends Modal {
  constructor() {
    super('Disable hardware profile');
  }

  findDisableButton() {
    return this.findFooter().findByRole('button', { name: 'Disable' });
  }

  findCancelButton() {
    return this.findFooter().findByRole('button', { name: 'Cancel' });
  }
}

export const hardwareProfile = new HardwareProfile();
export const disableHardwareProfileModal = new DisableHardwareProfileModal();
