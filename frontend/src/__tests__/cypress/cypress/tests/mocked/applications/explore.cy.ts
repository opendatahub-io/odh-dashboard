import { explorePage } from '#~/__tests__/cypress/cypress/pages/explore';
import { mockComponents } from '#~/__mocks__/mockComponents';
import { jupyterCard } from '#~/__tests__/cypress/cypress/pages/components/JupyterCard';

describe('Explore Page', () => {
  beforeEach(() => {
    cy.interceptOdh('GET /api/components', null, mockComponents());
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

  it('card title should be visible', () => {
    jupyterCard.findExploreCard('rhoai').should('not.exist');
  });
});
