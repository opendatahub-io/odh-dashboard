import { portalPath } from '../support/portal';

export const portal = {
  visit: (pathname = '/'): Cypress.Chainable<Cypress.AUTWindow> => cy.visit(portalPath(pathname)),
  findNavigation: (): Cypress.Chainable<JQuery<HTMLElement>> => cy.findByRole('navigation'),
  findNavLink: (name: string): Cypress.Chainable<JQuery<HTMLElement>> =>
    portal.findNavigation().findByRole('link', { name }),
};
