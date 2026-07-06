import { appChrome } from './appChrome';
import { Contextual } from './components/Contextual';

class GroupSettingSection extends Contextual<HTMLElement> {
  shouldHaveAdministratorGroupInfo() {
    this.find().findByTestId('data-science-administrator-info').should('exist');
    return this;
  }

  findGroupRow(name: string) {
    return this.find().contains('td', name).closest('tr');
  }

  findRemoveGroupButton(name: string) {
    return this.find().findByTestId(`remove-group-button ${name}`);
  }

  findAddGroupButton() {
    return this.find().findByTestId('add-group-button');
  }

  findGroupNameInput() {
    return this.find().findByRole('combobox');
  }

  findGroupOption(name: string) {
    // Matches both a direct typeahead option ('rhods-admins')
    // and the creatable option shown when the name is not in the list ('Select "rhods-admins"')
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return this.find()
      .document()
      .findByRole('option', { name: new RegExp(`^(Select "${escaped}"|${escaped})$`) });
  }

  findSaveNewGroupButton() {
    return this.find().findByTestId('save-new-group-button');
  }

  findCancelAddGroupButton() {
    return this.find().findByRole('button', { name: 'Cancel add group' });
  }

  findDuplicateError() {
    return this.find().findByTestId('duplicate-group-error');
  }

  addGroup(name: string) {
    this.findAddGroupButton().click();
    this.findGroupNameInput().type(name);
    this.findGroupOption(name).click();
    // If the group is already in the table the save button will be aria-disabled.
    // Cancel gracefully so the test can continue without failing.
    this.findSaveNewGroupButton().then(($btn) => {
      if ($btn.attr('aria-disabled') === 'true') {
        this.findCancelAddGroupButton().click();
      } else {
        cy.wrap($btn).click();
      }
    });
  }
}

class UserManagement {
  visit(wait = true) {
    cy.visitWithLogin('/settings/user-management');
    if (wait) {
      this.wait();
    }
  }

  private wait() {
    cy.findByTestId('app-page-title').should('have.text', 'User management');
    cy.testA11y();
  }

  navigate() {
    this.findNavItem().click();
    this.wait();
  }

  findNavItem() {
    return appChrome.findNavItem({ name: 'User management', rootSection: 'Settings' });
  }

  shouldHaveSuccessAlertMessage() {
    cy.findByRole('heading', { name: 'Success alert: Group settings changes saved' }).should(
      'exist',
    );
    return this;
  }

  findRemoveGroupModal() {
    return cy.findByTestId('remove-group-modal');
  }

  findModalRemoveButton() {
    return cy.findByTestId('modal-remove-button');
  }

  getAdministratorGroupSection() {
    return new GroupSettingSection(() => cy.findByTestId('data-science-administrator-groups'));
  }

  getUserGroupSection() {
    return new GroupSettingSection(() => cy.findByTestId('data-science-user-groups'));
  }
}

export const userManagement = new UserManagement();
