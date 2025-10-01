import { appChrome } from './appChrome';
import { Contextual } from './components/Contextual';

class GroupSettingSection extends Contextual<HTMLElement> {
  shouldHaveAdministratorGroupInfo() {
    this.find().findByTestId('data-science-administrator-info');
    return this;
  }

  clearMultiChipItem() {
    this.find().findByRole('button', { name: 'Clear input value' }).click();
  }

  findMultiGroupInput() {
    return this.find().find('input');
  }

  findMultiGroupOptions(name: string) {
    return this.find().document().findByRole('option', { name });
  }

  private findChipGroup() {
    return this.find().findByRole('list', { name: 'Current selections' });
  }

  findChipItem(name: string | RegExp) {
    return this.findChipGroup().find('li').contains('span', name);
  }

  removeChipItem(name: string) {
    this.findChipGroup()
      .find('li')
      .findByRole('button', { name: `Close ${name}` })
      .click();
  }

  findErrorText() {
    return this.find().findByTestId('group-selection-error-text');
  }

  findMultiGroupSelectButton() {
    return this.find().findByTestId('group-setting-select');
  }

  selectMultiGroup(name: string) {
    this.findMultiGroupSelectButton().click();
    this.findMultiGroupOptions(name).click();
  }

  findWarningAlert(groupName: string) {
    this.find()
      .find('.pf-v6-c-alert.pf-m-inline.pf-m-warning')
      .should('exist')
      .contains(
        `The group ${groupName} no longer exists in OpenShift and has been removed from the selected group list.`,
      );
    return this;
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

  findSubmitButton() {
    return cy.findByTestId('save-button');
  }

  shouldHaveSuccessAlertMessage() {
    cy.findByRole('heading', { name: 'Success alert: Group settings changes saved' }).should(
      'exist',
    );
    return this;
  }

  getAdministratorGroupSection() {
    return new GroupSettingSection(() => cy.findByTestId('data-science-administrator-groups'));
  }

  getUserGroupSection() {
    return new GroupSettingSection(() => cy.findByTestId('data-science-user-groups'));
  }
}

export const userManagement = new UserManagement();
