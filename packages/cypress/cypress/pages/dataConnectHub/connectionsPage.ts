import { appChrome } from '../appChrome';

const DATA_CONNECT_HUB_DEV_FEATURE_FLAGS = 'devFeatureFlags=dataConnectHub=true';

class DataConnectHubConnectionsPage {
  visitConnectionTypes(namespace: string) {
    cy.visitWithLogin(
      `/ai-hub/connections/connection-types?project=${namespace}&${DATA_CONNECT_HUB_DEV_FEATURE_FLAGS}`,
    );
    this.wait();
  }

  visitConnections(namespace: string) {
    cy.visitWithLogin(
      `/ai-hub/connections/connections?project=${namespace}&${DATA_CONNECT_HUB_DEV_FEATURE_FLAGS}`,
    );
    this.wait();
  }

  findTab(tab: 'connection-types' | 'connections') {
    return cy.findByTestId(`tab-${tab}`);
  }

  findPageTitle() {
    return cy.findByTestId('app-page-title');
  }

  findConnectionTypesDescription() {
    return cy.findByText(/Discover and configure pre-defined data connections/);
  }

  findConnectionsEmptyState() {
    return cy.findByRole('heading', { name: 'Get started with data connections' });
  }

  findNavItem() {
    return appChrome.findNavItem({ name: 'Connections', rootSection: 'AI hub' });
  }

  shouldBeOnRoute(route: 'connection-types' | 'connections') {
    cy.location('pathname').should('eq', `/ai-hub/connections/${route}`);
  }

  private wait() {
    this.findPageTitle().should('exist');
  }
}

export const dataConnectHubConnectionsPage = new DataConnectHubConnectionsPage();
