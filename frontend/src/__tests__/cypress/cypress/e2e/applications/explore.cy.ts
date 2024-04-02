import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { mockStatus } from '~/__mocks__/mockStatus';
import { explorePage } from '~/__tests__/cypress/cypress/pages/explore';
import { mockComponents } from '~/__mocks__/mockComponents';
import { jupyterCard } from '~/__tests__/cypress/cypress/pages/components/JupyterCard';

describe('Explore Page', () => {
  beforeEach(() => {
    cy.intercept('/api/dsc/status', mockDscStatus({}));
    cy.intercept('/api/status', mockStatus());
    cy.intercept('/api/config', mockDashboardConfig({}));
    cy.intercept('/api/components', mockComponents());
    explorePage.visit();
  });

  it('check jupyter card details', () => {
    jupyterCard.findBrandImage().should('be.visible');
    jupyterCard.findCardTitle().should('have.text', 'Jupyter');
    jupyterCard.findCardProvider().should('have.text', 'by Jupyter');
    jupyterCard
      .findCardBody()
      .should(
        'have.text',
        'A multi-user version of the notebook designed for companies, classrooms and research labs.',
      );
  });

  it('should have selectable cards', () => {
    jupyterCard.findExploreCard('jupyter').click();
    jupyterCard.findDrawerPanel().should('be.visible');
  });

  it('hidden app should not exist', () => {
    explorePage.visit();
    jupyterCard.findExploreCard('rhoai').should('not.exist');
  });
});
