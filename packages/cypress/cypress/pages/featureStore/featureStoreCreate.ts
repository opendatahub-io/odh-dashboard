import type { UserAuthConfig } from '../../types';

const FEATURE_STORE_ADMIN_DEV_FLAG = 'devFeatureFlags=featureStoreAdmin=true';

class FeatureStoreCreatePage {
  visit() {
    cy.visitWithLogin(
      '/develop-train/feature-store/create?devFeatureFlags=Feature+store+plugin%3Dtrue',
    );
    this.wait();
  }

  visitWithAdminFlag(user: UserAuthConfig) {
    cy.visitWithLogin(`/develop-train/feature-store/create?${FEATURE_STORE_ADMIN_DEV_FLAG}`, user);
    cy.testA11y();
  }

  private wait() {
    cy.findByTestId('app-page-title').should('have.text', 'Create feature store');
    cy.testA11y();
  }

  findPageTitle() {
    return cy.findByTestId('app-page-title');
  }

  findWizard() {
    return cy.findByTestId('feast-create-wizard');
  }

  findNextButton() {
    return cy.findByTestId('feast-wizard-next');
  }

  findSubmitButton() {
    return cy.findByTestId('feast-wizard-submit');
  }

  findBackButton() {
    return cy.findByRole('button', { name: 'Back' });
  }

  findCancelButton() {
    return cy.findByRole('button', { name: 'Cancel' });
  }

  findStepByName(stepName: string) {
    return cy.findByRole('button', { name: stepName });
  }

  findProjectNameInput() {
    return cy.findByTestId('feast-project-name');
  }

  fillProjectName(name: string) {
    this.findProjectNameInput().clear().type(name);
    return this;
  }

  findNamespaceToggle() {
    return cy.findByTestId('feast-namespace-toggle');
  }

  selectNamespace(ns: string) {
    // SimpleSelect auto-selects and disables the toggle when only one option exists.
    this.findNamespaceToggle().should(($el) => {
      const disabled = $el.is(':disabled');
      const text = $el.text();
      const nsMatch = text === ns || text.endsWith(`(${ns})`);
      expect(
        !disabled || nsMatch,
        `namespace toggle should be enabled or already show "${ns}" (disabled=${disabled}, text="${text}")`,
      ).to.eq(true);
    });
    this.findNamespaceToggle().then(($el) => {
      if (!$el.is(':disabled')) {
        cy.wrap($el).click();
        cy.findByRole('option', { name: new RegExp(`\\(${ns}\\)|^${ns}$`) }).click();
      }
    });
    return this;
  }

  findProjectNameError() {
    return cy.findByTestId('feast-project-name-error');
  }

  findRegistryTypeRadio(type: 'local' | 'remote') {
    return cy.findByTestId(`feast-registry-${type}`);
  }

  findFeastRefNameInput() {
    return cy.findByTestId('feast-ref-name');
  }

  findRestApiSwitch() {
    return cy.findByTestId('feast-registry-rest-api');
  }

  clickNext() {
    this.findNextButton().click();
    return this;
  }
}

export const featureStoreCreatePage = new FeatureStoreCreatePage();
