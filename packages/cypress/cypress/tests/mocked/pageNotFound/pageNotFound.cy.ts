import { pageNotfound } from '../../../pages/pageNotFound';
import { verifyRelativeURL } from '../../../utils/url';

describe('Page not found', () => {
  it('Validate that invalid URL will navigate to the not found page', () => {
    pageNotfound.visit();
    pageNotfound.findHomePageButton().click();
    verifyRelativeURL('/');
  });
});
