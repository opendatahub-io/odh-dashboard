import { Contextual } from '../components/Contextual';

class FeatureLineage extends Contextual<HTMLElement> {
  findFeatureStorePage() {
    return cy.findByTestId('feature-store-page');
  }

  findLineageTab() {
    return cy.findByTestId('lineage-tab');
  }

  findLineageTabContent() {
    return cy.findByTestId('tabContent-Lineage');
  }

  findFeatureViewLineageTab() {
    return cy.findByTestId('lineage-feature-views-tab');
  }

  findFeatureViewLineageSection() {
    return cy.findByTestId('feature-view-lineage');
  }

  findLineageToolbar() {
    return cy.findByTestId('lineage-search-filter');
  }

  findLineageFilterDropdown() {
    return cy.findByTestId('lineage-search-filter-dropdown');
  }

  findLineageGraphSurface() {
    return cy.get('.pf-topology-visualization-surface__svg');
  }

  visitFeatureViewDetails(project: string, featureViewName: string) {
    cy.visitWithLogin(
      `/develop-train/feature-store/feature-views/${project}/${featureViewName}?devFeatureFlags=Feature+store+plugin%3Dtrue`,
    );
    cy.findByTestId('app-page-title').should('contain.text', featureViewName);
    cy.testA11y({ exclude: [['.pf-v6-c-tabs']] });
    return this;
  }

  waitForLineageLoaded() {
    cy.findByRole('heading', { name: 'Loading lineage data...' }).should('not.exist');
    cy.findByRole('heading', { name: 'Initializing visualization...' }).should('not.exist');
    return this;
  }

  openOverviewLineageTab() {
    this.findLineageTab().click();
    return this;
  }

  openFeatureViewLineageTab() {
    this.findFeatureViewLineageTab().click();
    return this;
  }

  selectFilterType(filterLabel: string) {
    this.findLineageFilterDropdown().then(($toggle) => {
      if ($toggle.text().trim() !== filterLabel) {
        cy.wrap($toggle).click({ force: true });
        cy.findByRole('menuitem', { name: filterLabel }).click();
      }
    });
    return this;
  }

  applyEntityFilter(entityName: string) {
    this.selectFilterType('Entity');
    cy.findByPlaceholderText('Filter by entity name').type(entityName);
    cy.findByTestId(`select-multi-typeahead-${entityName}`).click();
    return this;
  }

  toggleHideNodesWithoutRelationships() {
    cy.findByLabelText('Toggle visibility of nodes without relationships').click({ force: true });
    return this;
  }

  clickNodeByLabel(nodeLabel: string) {
    this.findLineageGraphSurface()
      .contains(new RegExp(`\\b${nodeLabel}\\b`))
      .closest('[data-kind="node"]')
      .click();
    return this;
  }

  shouldShowPopoverWithName(name: string) {
    cy.get('.pf-v6-c-popover').should('be.visible').and('contain.text', name);
    return this;
  }

  findViewDetailsPageLink(detailsLabel: string) {
    return cy.findByRole('link', { name: new RegExp(detailsLabel, 'i') });
  }

  shouldShowLineageError() {
    cy.get('.pf-v6-c-alert.pf-m-danger')
      .should('be.visible')
      .and('contain.text', 'Error loading lineage data');
    return this;
  }

  findNodeLabel(nodeLabel: string) {
    return this.findLineageGraphSurface().contains(new RegExp(`\\b${nodeLabel}\\b`));
  }

  shouldNodeLabelExist(nodeLabel: string) {
    this.findNodeLabel(nodeLabel).should('exist');
    return this;
  }

  shouldNodeLabelNotExist(nodeLabel: string) {
    this.findNodeLabel(nodeLabel).should('not.exist');
    return this;
  }

  shouldShowEmptyLineageGraph() {
    this.findLineageGraphSurface().should('exist');
    return this;
  }
}

export const featureLineage = new FeatureLineage(() => cy.findByTestId('feature-store-page'));
