import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';

export class HomeAdminSection extends Contextual<HTMLElement> {
  findNotebookImageCard(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('landing-page-admin--notebook-images');
  }

  findNotebookImageButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('landing-page-admin--notebook-images-button');
  }

  findServingRuntimeButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('landing-page-admin--serving-runtimes-button');
  }

  findClusterSettingButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('landing-page-admin--cluster-settings-button');
  }

  findUserManagementButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('landing-page-admin--user-management-button');
  }

  findServingRuntimeCard(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('landing-page-admin--serving-runtimes');
  }

  findClusterSettingCard(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('landing-page-admin--cluster-settings');
  }

  findUserManagementCard(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('landing-page-admin--user-management');
  }
}
