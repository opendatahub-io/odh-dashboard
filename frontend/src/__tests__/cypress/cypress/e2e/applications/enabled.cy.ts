import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { mockStatus } from '~/__mocks__/mockStatus';
import { mockComponents } from '~/__mocks__/mockComponents';
import { enabledPage } from '~/__tests__/cypress/cypress/pages/enabled';
import { jupyterCard } from '~/__tests__/cypress/cypress/pages/components/JupyterCard';

describe('Enabled Page', () => {
  beforeEach(() => {
    cy.intercept('/api/dsc/status', mockDscStatus({}));
    cy.intercept('/api/status', mockStatus());
    cy.intercept('/api/config', mockDashboardConfig({}));
    cy.intercept('/api/components?installed=true', mockComponents());
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
