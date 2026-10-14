import { autoragConfigurePage } from '../../../pages/autorag/configurePage';

describe('AutoRAG database option selector', () => {
  it('selects an exact connection name when a colliding option appears first', () => {
    cy.visit('about:blank');
    cy.document().then((document) => {
      const listbox = document.createElement('div');
      listbox.innerHTML = `
        <div role="option">db-production</div>
        <div role="option">db <span>PGVector</span></div>
      `;
      document.body.appendChild(listbox);
    });

    autoragConfigurePage.findDatabaseOption('db').should('have.text', 'db PGVector');
  });
});
