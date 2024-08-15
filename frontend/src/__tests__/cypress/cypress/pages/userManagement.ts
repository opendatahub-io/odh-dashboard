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
    return this.find().findByRole('option', { name });
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
      .findByRole('button', { name: `close ${name}` })
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
}
class UserManagement {
  visit(wait = true) {
    cy.visitWithLogin('/groupSettings');
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
    return appChrome.findNavItem('User management', 'Settings');
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
