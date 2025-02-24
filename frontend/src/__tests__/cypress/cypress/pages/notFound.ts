export const notFoundPage = {
  getNotFoundPage: () => cy.get('[data-testid="not-found-page"]'),
  getDescription: () => cy.get('[data-testid="not-found-page-description"]'),
  getHomeButton: () => cy.get('[data-testid="home-page-button"]'),
};
