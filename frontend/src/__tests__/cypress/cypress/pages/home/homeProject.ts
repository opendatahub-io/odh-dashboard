import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';

export class HomeProject extends Contextual<HTMLElement> {
  findEmptyProjectCard(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('landing-page-projects-empty');
  }

  findCreateProjectButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('create-project-button');
  }

  findSectionHeaderCreateProjectButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('create-project');
  }

  findCreateProjectCard(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('create-project-card');
  }

  findProjectRequestIcon(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('request-project-help');
  }

  findRequestProjectCard(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('request-project-card');
  }

  findProjectLinkButton(projectName: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId(`project-link-${projectName}`);
  }

  findGoToProjectLink(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('goto-projects-link');
  }
}
