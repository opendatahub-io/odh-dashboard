import { Modal } from './components/Modal';
import { TableRow } from './components/table';

class AcceleratorRow extends TableRow {
  findDescription() {
    return this.find().findByTestId('description');
  }

  shouldHaveIdentifier(name: string) {
    this.find().find(`[data-label=Identifier]`).should('have.text', name);
    return this;
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
    this.find().find(`[data-label="Toleration Seconds"]`).should('have.text', toleration);
    return this;
  }
}

class AcceleratorProfile {
  visit() {
    cy.visitWithLogin('/acceleratorProfiles');
    this.wait();
  }

  shouldBeSortedByColumn(column: string, order: string) {
    this.findColumn(column).then(($cells) => {
      const cellValues = Array.from($cells).map((cell) => cell.textContent?.trim());
      const sortedCellValues =
        order === 'asc'
          ? [...cellValues].sort()
          : [...cellValues].sort((a, b) =>
              b === undefined || a === undefined ? -1 : b.localeCompare(a),
            );
      expect(cellValues).to.deep.equal(sortedCellValues);
    });
    return this;
  }

  private wait() {
    this.findAppPage();
    cy.testA11y();
  }

  private findAppPage() {
    return cy.findByTestId('app-page-title');
  }

  findAddButton() {
    return cy.findByTestId('display-accelerator-modal-button');
  }

  findEmptyText() {
    return cy.findByTestId('no-available-accelerator-profiles');
  }

  findCreateButton() {
    return cy.findByTestId('create-accelerator-profile');
  }

  findTableHeaderButton(name: string) {
    return this.findTable().find('thead').findByRole('button', { name });
  }

  findResetButton() {
    return cy.findByRole('button', { name: 'Reset' });
  }

  findFilterMenuOption() {
    return cy.findByTestId('filter-dropdown-select');
  }

  findSearchInput() {
    return cy.findByRole('textbox', { name: 'Search input' });
  }

  private findTable() {
    return cy.findByTestId('accelerator-profile-table');
  }

  private findColumn(column: string) {
    return this.findTable().find('tbody').find(`[data-label=${column}]`);
  }

  getRow(name: string) {
    return new AcceleratorRow(() =>
      this.findTable().find(`[data-label=Name]`).contains(name).parents('tr'),
    );
  }
}

class ManageAcceleratorProfile {
  findAcceleratorNameInput() {
    return cy.findByTestId('accelerator-name-input');
  }

  findIdentifierInput() {
    return cy.findByTestId('accelerator-identifier-input');
  }

  shouldHaveModalEmptyState() {
    cy.findByTestId('tolerations-modal-empty-state').should('exist');
    return this;
  }

  findTolerationsButton() {
    return cy.findByTestId('add-toleration-button');
  }

  findDescriptionInput() {
    return cy.findByTestId('accelerator-description-input');
  }

  findSubmitButton() {
    return cy.findByTestId('accelerator-profile-create-button');
  }

  private findTable() {
    return cy.findByTestId('toleration-table');
  }

  getRow(name: string) {
    return new TolerationRow(() =>
      this.findTable().find(`[data-label=Key]`).contains(name).parents('tr'),
    );
  }
}

class TolerationsModal extends Modal {
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
    return this.findTolerationOperatorSelect().findDropdownItem(
      'Exists A toleration "matches" a taint if the keys are the same and the effects are the same. No value should be specified.',
    );
  }

  findOperatorOptionEqual() {
    return this.findTolerationOperatorSelect().findDropdownItem(
      'Equal A toleration "matches" a taint if the keys are the same, the effects are the same, and the values are equal.',
    );
  }

  findEffectOptionNoExecute() {
    return this.findTolerationEffectSelect().findDropdownItem(
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

class CreateAcceleratorProfile extends ManageAcceleratorProfile {
  visit() {
    cy.visitWithLogin('/acceleratorProfiles/Create');
    this.wait();
  }

  private wait() {
    this.findSubmitButton().contains('Create accelerator profile');
    cy.testA11y();
  }
}

class EditAcceleratorProfile extends ManageAcceleratorProfile {
  visit(name: string) {
    cy.visitWithLogin(`/acceleratorProfiles/edit/${name}`);
    cy.testA11y();
  }

  findErrorText() {
    return cy.findByTestId('problem-loading-accelerator-profile');
  }

  findViewAllAcceleratorButton() {
    return cy.findByTestId('view-all-accelerator-profiles');
  }
}

class IdentifierAcceleratorProfile extends ManageAcceleratorProfile {
  visit(multiple = false) {
    cy.visitWithLogin(
      multiple
        ? `/acceleratorProfiles/create?identifiers=test-identifier%2Ctest-identifier2`
        : `/acceleratorProfiles/create?identifiers=test-identifier`,
    );
    this.wait();
  }

  private wait() {
    this.findSubmitButton().contains('Create accelerator profile');
    cy.testA11y();
  }

  findAcceleratorIdentifierSelect() {
    return cy.findByTestId('accelerator-button');
  }
}

export const acceleratorProfile = new AcceleratorProfile();
export const createAcceleratorProfile = new CreateAcceleratorProfile();
export const createTolerationModal = new TolerationsModal(false);
export const editTolerationModal = new TolerationsModal(true);
export const editAcceleratorProfile = new EditAcceleratorProfile();
export const identifierAcceleratorProfile = new IdentifierAcceleratorProfile();
