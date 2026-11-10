import { autoragResultsPage } from '../../../pages/autorag/resultsPage';

const renderLeaderboard = (rows: string[], outsideMarkup = ''): void => {
  cy.document().then((currentDocument) => {
    const { body } = currentDocument;
    body.innerHTML = `
      ${outsideMarkup}
      <table data-testid="leaderboard-table">
        <tbody>${rows.join('')}</tbody>
      </table>
    `;
  });
};

describe('AutoRAG results page object', () => {
  it('allows an all-ranked leaderboard to have no unranked rows', () => {
    renderLeaderboard(['<tr data-testid="leaderboard-row-1"><td data-testid="rank-1">1</td></tr>']);

    cy.step('Verify no unranked leaderboard rows are returned');
    autoragResultsPage.findUnrankedLeaderboardRows().should('have.length', 0);
  });

  it('finds an unranked row and its rank cell when present', () => {
    renderLeaderboard(
      [
        '<tr data-testid="leaderboard-row-1"><td data-testid="rank-1">1</td></tr>',
        '<tr data-testid="leaderboard-row-unranked-invalid"><td data-testid="rank-unranked-invalid">Unranked</td></tr>',
      ],
      '<div data-testid="rank-unranked-outside">Incorrect</div>',
    );

    cy.step('Verify the unranked leaderboard row remains visible');
    autoragResultsPage.findFirstUnrankedLeaderboardRow().should('be.visible');
    autoragResultsPage.findFirstUnrankedLeaderboardRankCell().should('contain.text', 'Unranked');
  });
});
