import { pageNotfound } from '#~/__tests__/cypress/cypress/pages/pageNotFound';
import { verifyRelativeURL } from '#~/__tests__/cypress/cypress/utils/url';

describe('Page not found', () => {
  it('Validate that invalid URL will navigate to the not found page', () => {
    pageNotfound.visit();
    pageNotfound.findHomePageButton().click();
    verifyRelativeURL('/');
  });
});
