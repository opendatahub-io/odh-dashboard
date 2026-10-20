import { aiAssetsPage } from '@odh-dashboard/gen-ai/testing/pages';
import { portal } from '../../pages/portal';
import { setupPlaygroundMocks } from '../../support/playground';
import { setupPortalMocks } from '../../support/portal';

describe('Portal Grid feature flag', () => {
  for (const grid of [false, true]) {
    it(`${grid ? 'hides' : 'shows'} the project selector with Grid ${
      grid ? 'enabled' : 'disabled'
    }`, () => {
      setupPortalMocks({ grid });
      setupPlaygroundMocks();
      portal.visit('/gen-ai-studio/assets/portal-project');
      cy.wait('@models');
      aiAssetsPage.findTitle().should('be.visible').and('have.text', 'AI asset endpoints');
      aiAssetsPage.findProjectSelector().should(grid ? 'not.exist' : 'be.visible');
      cy.reload();
      cy.wait('@models');
      aiAssetsPage.findTitle().should('be.visible').and('have.text', 'AI asset endpoints');
      aiAssetsPage.findProjectSelector().should(grid ? 'not.exist' : 'be.visible');
    });
  }
});
