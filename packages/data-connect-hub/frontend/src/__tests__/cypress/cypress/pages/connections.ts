class ConnectionsPage {
  visit() {
    cy.visit('/');
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').should('exist');
    cy.testA11y();
  }

  findTab(tab: 'connection-types' | 'connections') {
    return cy.findByTestId(`tab-${tab}`);
  }
}

export const connectionsPage = new ConnectionsPage();
