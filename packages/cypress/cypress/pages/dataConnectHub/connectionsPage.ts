import { connectionRowMatches, connectionTypeCardMatches } from './connectionSelectors';
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
    return cy.findByTestId('connection-types-description');
  }

  findConnectionTypesGallery() {
    return cy.findByTestId('connection-types-gallery-toolbar');
  }

  findConnectionsEmptyState() {
    return cy.findByTestId('connections-empty-state');
  }

  findNavItem(name: string, rootSection: string) {
    return appChrome.findNavItem({ name, rootSection });
  }

  shouldBeOnRoute(route: 'connection-types' | 'connections') {
    cy.location('pathname').should('eq', `/ai-hub/connections/${route}`);
  }

  findToolbarCreateConnectionButton() {
    return cy.findByTestId('connections-toolbar-create-button');
  }

  findEmptyStateCreateConnectionButton() {
    return cy.findByTestId('connections-empty-state-create-button');
  }

  findCreateConnectionTearsheet() {
    return cy.findByTestId('create-connection-tearsheet');
  }

  /**
   * Selectable wizard cards render a visually hidden radio with no accessible name (PatternFly only
   * forwards aria-label when no label is supplied), and the card body is not clickable. Locate the
   * card by its exact title, then select and verify its radio and the enabled Next button.
   */
  selectConnectionType(name: string) {
    this.findCreateConnectionTearsheet()
      .findAllByTestId(/--ConnectionTypeCard$/)
      .filter((_index, card) => connectionTypeCardMatches(card, name))
      .find('input[type="radio"]')
      .click({ force: true })
      .should('be.checked');
    this.findWizardNextButton().should('be.enabled');
  }

  findWizardNextButton() {
    return cy.findByTestId('connection-wizard-next');
  }

  findWizardBackButton() {
    return cy.findByTestId('connection-wizard-back');
  }

  findConnectionNameInput() {
    return cy.findByTestId('connection-name-input');
  }

  findConnectionDescriptionInput() {
    return cy.findByTestId('connection-description-input');
  }

  findAddPropertyButton() {
    return cy.findByTestId('add-connection-property-button');
  }

  findPropertyKeyInput(propertyId: number) {
    return cy.findByTestId(`connection-property-key-${propertyId}`);
  }

  findPropertyValueInput(propertyId: number) {
    return cy.findByTestId(`connection-property-value-${propertyId}`);
  }

  findCredentialField(name: string) {
    return cy.findByTestId(`credential-${name}`);
  }

  findReviewConnectionName() {
    return cy.findByTestId('review-connection-name');
  }

  findReviewProject() {
    return cy.findByTestId('review-project');
  }

  findReviewConnectionType() {
    return cy.findByTestId('review-connection-type');
  }

  findCreateConnectionSubmitButton() {
    return cy.findByTestId('create-connection-submit');
  }

  findConnectionsTable() {
    return cy.findByTestId('connections-table');
  }

  findConnectionTableRow(name: string) {
    return this.findConnectionsTable()
      .find('tbody tr')
      .filter((_index, row) => connectionRowMatches(row, name));
  }

  findConnectionDetails() {
    return cy.findByTestId('connection-details');
  }

  findConnectionDetailsCard() {
    return cy.findByTestId('connection-details-card');
  }

  findConnectionPropertiesCard() {
    return cy.findByTestId('connection-properties-card');
  }

  private wait() {
    this.findPageTitle().should('exist');
  }
}

export const dataConnectHubConnectionsPage = new DataConnectHubConnectionsPage();
