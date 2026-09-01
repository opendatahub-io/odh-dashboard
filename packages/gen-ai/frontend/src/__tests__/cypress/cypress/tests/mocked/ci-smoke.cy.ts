import {
  visitApp,
  waitForPageLoad,
  checkAppLoaded,
} from '~/__tests__/cypress/cypress/support/commands/common';

describe('App Tests', () => {
  it('Loads app successfully', () => {
    visitApp();
    waitForPageLoad();
    checkAppLoaded();
  });
});
