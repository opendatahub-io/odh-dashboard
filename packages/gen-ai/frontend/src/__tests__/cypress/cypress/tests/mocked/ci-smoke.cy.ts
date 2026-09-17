import {
  visitApp,
  waitForPageLoad,
  checkAppLoaded,
} from '~/__tests__/cypress/cypress/support/commands/common';

describe('App Tests', () => {
  before(() => {
    visitApp();
    waitForPageLoad();
  });

  it('Loads app successfully', () => {
    checkAppLoaded();
  });
});
