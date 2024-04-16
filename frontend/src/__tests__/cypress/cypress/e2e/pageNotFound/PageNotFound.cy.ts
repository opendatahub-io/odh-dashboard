import { mockComponents } from '~/__mocks__/mockComponents';
import { pageNotfound } from '~/__tests__/cypress/cypress/pages/pageNotFound';
import { verifyRelativeURL } from '~/__tests__/cypress/cypress/utils/url';

describe('page not found', () => {
  beforeEach(() => {
    cy.interceptOdh('GET /api/components', { query: { installed: 'true' } }, mockComponents());
  });

  it('Validate that invalid URL will navigate to the not found page', () => {
    pageNotfound.visit('not-found');
    pageNotfound.shouldHavePageNotFoundTitle();
    pageNotfound.shouldHavePageNotFoundDescription();
    pageNotfound.findHomePageButton().click();
    verifyRelativeURL('/');
  });
});
