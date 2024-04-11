import { mockComponents } from '~/__mocks__/mockComponents';
import { enabledPage } from '~/__tests__/cypress/cypress/pages/enabled';
import { jupyterCard } from '~/__tests__/cypress/cypress/pages/components/JupyterCard';

describe('Enabled Page', () => {
  beforeEach(() => {
    cy.interceptOdh('GET /api/components', { query: { installed: 'true' } }, mockComponents());
  });

  it('check jupyter card details', () => {
    enabledPage.visit();
    jupyterCard.findBrandImage().should('be.visible');
    jupyterCard.findCardTitle().should('have.text', 'Jupyter');
    jupyterCard.findTooltipInfo().should('exist');
    jupyterCard.findPartnerBadge().should('have.text', 'Red Hat managed');
    jupyterCard
      .findPartnerBadgeDescription()
      .should(
        'have.text',
        'A multi-user version of the notebook designed for companies, classrooms and research labs.',
      );
  });
});
