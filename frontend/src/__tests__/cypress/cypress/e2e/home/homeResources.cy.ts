import { mockDocs } from '~/__mocks__/mockDocs';
import { mockComponents } from '~/__mocks__/mockComponents';
import { mockQuickStarts } from '~/__mocks__/mockQuickStarts';
import { homePage } from '~/__tests__/cypress/cypress/pages/home';

describe('Home page Resources section', () => {
  beforeEach(() => {
    cy.interceptOdh('GET /api/docs', mockDocs());
    cy.interceptOdh('GET /api/components', null, mockComponents());
    cy.interceptOdh('GET /api/quickstarts', mockQuickStarts());
    homePage.initHomeIntercepts({ disableHome: false });
    homePage.visit();
  });
  it('should show the resources section', () => {
    cy.findByTestId('landing-page-resources').scrollIntoView();
    cy.findByTestId('resource-card-create-jupyter-notebook').should('be.visible');
  });
  it('should hide the the resource section if none are available', () => {
    cy.interceptOdh('GET /api/quickstarts', []);
    homePage.visit();

    cy.findByTestId('landing-page-resources').should('not.exist');
  });
  it('should navigate to the resources page', () => {
    homePage.visit();

    cy.findByTestId('goto-resources-link').scrollIntoView();
    cy.findByTestId('goto-resources-link').click();
    cy.findByTestId('app-page-title').should('have.text', 'Resources');
  });
});
