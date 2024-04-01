import { mockDashboardConfig, mockDscStatus, mockStatus } from '~/__mocks__';
import { mockComponents } from '~/__mocks__/mockComponents';
import { pageNotfound } from '~/__tests__/cypress/cypress/pages/pageNotFound';
import { verifyRelativeURL } from '~/__tests__/cypress/cypress/utils/url.cy';

describe('page not found', () => {
  beforeEach(() => {
    cy.intercept('/api/dsc/status', mockDscStatus({}));
    cy.intercept('/api/status', mockStatus());
    cy.intercept('/api/config', mockDashboardConfig({}));
    cy.intercept('/api/components?installed=true', mockComponents());
  });

  it('Validate that invalid URL will navigate to the not found page', () => {
    pageNotfound.visit('not-found');
    pageNotfound.shouldHavePageNotFoundTitle();
    pageNotfound.shouldHavePageNotFoundDescription();
    pageNotfound.findHomePageButton().click();
    verifyRelativeURL('/');
  });
});
