import {
  checkAppLoaded,
  visitApp,
  waitForPageLoad,
} from '~/src/__tests__/cypress/support/commands/common';

describe('App Tests', () => {
  beforeEach(() => {
    visitApp();
    waitForPageLoad();
  });

  it('Loads app successfully', () => {
    checkAppLoaded();
  });
});
