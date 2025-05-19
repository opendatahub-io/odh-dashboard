import { Contextual } from '~/__tests__/cypress/cypress/pages/components/Contextual';

class AcceleratorProfileGroup extends Contextual<HTMLElement> {}

export class AcceleratorProfileSection {
  findSelect(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('accelerator-profile-select');
  }

  findAcceleratorProfileSearchSelector(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('accelerator-profile-selection-toggle');
  }

  findAcceleratorProfileSearchInput(): Cypress.Chainable<JQuery<HTMLInputElement>> {
    return cy.findByTestId('accelerator-profile-selection-search').find('input');
  }

  findGlobalAcceleratorProfileLabel(): Cypress.Chainable<JQuery<HTMLBodyElement>> {
    return cy.get('body').contains('Global accelerator profiles');
  }

  getProjectScopedAcceleratorProfileLabel(): Cypress.Chainable<JQuery<HTMLBodyElement>> {
    return cy.get('body').contains('Project-scoped accelerator profiles');
  }

  findProjectScopedLabel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('project-scoped-label');
  }

  findGlobalScopedLabel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('global-scoped-label');
  }

  getProjectScopedAcceleratorProfile(): Contextual<HTMLElement> {
    return new AcceleratorProfileGroup(() =>
      cy.findByTestId('project-scoped-accelerator-profiles'),
    );
  }

  getGlobalScopedAcceleratorProfile(): Contextual<HTMLElement> {
    return new AcceleratorProfileGroup(() => cy.findByTestId('global-scoped-accelerator-profiles'));
  }
}

export const acceleratorProfileSection = new AcceleratorProfileSection();
