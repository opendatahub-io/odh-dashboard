import { initHomeIntercepts } from '~/__tests__/cypress/cypress/e2e/home/homeUtils';
import { mockDocs } from '~/__mocks__/mockDocs';
import { mockComponents } from '~/__mocks__/mockComponents';
import { mockQuickStarts } from '~/__mocks__/mockQuickStarts';

describe('Home page Resources section', () => {
  beforeEach(() => {
    cy.interceptOdh('GET /api/docs', mockDocs());
    cy.interceptOdh('GET /api/components', null, mockComponents());
    cy.interceptOdh('GET /api/quickstarts', mockQuickStarts());

    cy.visit('/');
  });
  it('should show the resources section', () => {
    initHomeIntercepts({ disableHome: false });
    cy.visit('/');

    cy.findByTestId('landing-page-resources').should('be.visible');
  });
  it('should hide the the resource section if none are available', () => {
    cy.interceptOdh('GET /api/quickstarts', []);

    initHomeIntercepts({ disableHome: false });
    cy.visit('/');

    cy.findByTestId('landing-page-resources').should('not.exist');
  });
  it('should navigate to the project list', () => {
    initHomeIntercepts({ disableHome: false });
    cy.visit('/');

    cy.findByTestId('goto-resources-link').click();
    cy.findByTestId('app-page-title').should('have.text', 'Resources');
  });
});
