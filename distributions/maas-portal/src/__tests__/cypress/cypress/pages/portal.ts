import { portalPath } from '../support/portal';

export const portal = {
  visit: (pathname = '/'): Cypress.Chainable<Cypress.AUTWindow> => cy.visit(portalPath(pathname)),
  findNavigation: (): Cypress.Chainable<JQuery<HTMLElement>> =>
    cy.findByRole('navigation', { name: 'Navigation' }),
  findNavLink: (name: string): Cypress.Chainable<JQuery<HTMLElement>> =>
    portal.findNavigation().findByRole('link', { name }),
  findUserMenu: (): Cypress.Chainable<JQuery<HTMLElement>> =>
    cy.findByRole('button', { name: 'User menu' }),
  findLogOut: (): Cypress.Chainable<JQuery<HTMLElement>> =>
    cy.findByRole('menuitem', { name: 'Log out' }),
};
