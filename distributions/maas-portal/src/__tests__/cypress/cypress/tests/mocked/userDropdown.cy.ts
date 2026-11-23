import { portal } from '../../pages/portal';
import { maasApi, setupPortalMocks } from '../../support/portal';

describe('MaaS portal user menu', () => {
  it('shows the signed-in user and opens the Log out action', () => {
    setupPortalMocks();
    cy.intercept('GET', maasApi('/whoami'), {
      data: { sub: 'portal-user', name: 'Alex Doe', isAdmin: false },
    }).as('namedWhoami');
    cy.intercept('GET', '/oauth2/sign_out*', {
      statusCode: 200,
      headers: { 'content-type': 'text/html' },
      body: '<html><body>Signed out</body></html>',
    }).as('signOut');

    portal.visit();
    cy.wait('@namedWhoami');
    portal
      .findUserMenu()
      .should('contain.text', 'Alex Doe')
      .and('have.attr', 'aria-expanded', 'false');
    portal.findUserMenu().click();
    portal.findUserMenu().should('have.attr', 'aria-expanded', 'true');
    portal.findLogOut().should('be.visible');
    portal.findLogOut().click();
    cy.wait('@signOut').its('request.url').should('include', 'rd=%2Fmaas-portal%2F');
    cy.location('pathname').should('eq', '/oauth2/sign_out');
  });
});
