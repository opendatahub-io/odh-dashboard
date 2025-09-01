import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';
import { TableRow } from '#~/__tests__/cypress/cypress/pages/components/table';

class FeatureDataSourcesTable extends Contextual<HTMLElement> {
  findTable() {
    return cy.findByTestId('feature-store-data-sources-table');
  }

  findEmptyState() {
    return cy.findByText('No data sources');
  }

  findRow(dataSourceName: string) {
    return new FeatureDataSourceTableRow(() =>
      this.findTable().find('[data-label="Data Sources"]').contains(dataSourceName).parents('tr'),
    );
  }

  findRows() {
    return this.findTable().find('tbody tr');
  }

  shouldHaveDataSourceCount(count: number) {
    if (count === 0) {
      this.findEmptyState().should('exist');
    } else {
      this.findRows().should('have.length', count);
    }
    return this;
  }

  findToolbar() {
    return new FeatureDataSourceToolbar(() => cy.findByTestId('feature-store-table-toolbar'));
  }

  findToolbarClearFiltersButton() {
    return cy.findByRole('button', { name: 'Clear all filters' });
  }
}

class FeatureDataSourceToolbar extends Contextual<HTMLElement> {
  findToggleButton(id: string) {
    return this.find().pfSwitch(id).click();
  }

  findFilterMenuOption(id: string, name: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findToggleButton(id).parents().findByRole('menuitem', { name });
  }

  findSearchInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('filter-toolbar-text-field');
  }

  findFilterDropdown(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('filter-toolbar-dropdown');
  }
}

class FeatureDataSourceTableRow extends TableRow {
  findDataSourceName() {
    return this.find().find('[data-label="Data Sources"]');
  }

  findDataSourceLink() {
    return this.find().findByTestId('data-source-name-link');
  }

  findProject() {
    return this.find().find('[data-label="Project"]');
  }

  findType() {
    return this.find().find('[data-label="Data source connector"]');
  }

  findFeatureViews() {
    return this.find().find('[data-label="Feature views"]');
  }

  findLastModified() {
    return this.find().find('[data-label="Last modified"]');
  }

  findCreated() {
    return this.find().find('[data-label="Created"]');
  }

  findOwner() {
    return this.find().find('[data-label="Owner"]');
  }

  shouldHaveDataSourceName(name: string) {
    this.findDataSourceName().should('contain.text', name);
    return this;
  }

  shouldHaveProject(project: string) {
    this.findProject().should('contain.text', project);
    return this;
  }

  shouldHaveType(type: string) {
    this.findType().should('contain.text', type);
    return this;
  }

  shouldHaveFeatureViewsCount(count: number) {
    this.findFeatureViews().should('contain.text', count.toString());
    return this;
  }

  shouldHaveOwner(owner: string) {
    this.findOwner().should('contain.text', owner);
    return this;
  }

  clickDataSourceLink() {
    this.findDataSourceLink().click();
  }

  // Feature views popover methods
  clickFeatureViewsPopover() {
    this.findFeatureViews().find('button').click();
    return this;
  }

  shouldShowFeatureViewsPopover() {
    cy.findByRole('dialog').should('be.visible');
    return this;
  }

  clickFeatureViewInPopover(featureViewName: string) {
    cy.findByRole('dialog').findByTestId(`popover-link-${featureViewName}`).click();
    return this;
  }

  shouldNavigateToFeatureView(featureViewName: string, projectName: string) {
    cy.url().should('include', `/featureStore/featureViews/${projectName}/${featureViewName}`);
    return this;
  }

  shouldContainFeatureViewInPopover(featureViewName: string) {
    cy.findByRole('dialog').findByTestId(`popover-link-${featureViewName}`).should('be.visible');
    return this;
  }
}

class DataSourceDetailsPage extends Contextual<HTMLElement> {
  findFeatureViewsTable() {
    return cy.findByTestId('feature-view-data-sources-table');
  }

  findSchemaTable() {
    return cy.findByTestId('data-source-schema-table');
  }

  findEmptyStateTitle() {
    return cy.findByTestId('data-source-feature-views-empty-state-title');
  }

  shouldShowFeatureViewsTable() {
    this.findFeatureViewsTable().should('be.visible');
    return this;
  }

  shouldShowSchemaTable() {
    this.findSchemaTable().should('be.visible');
    return this;
  }

  shouldShowEmptyState() {
    this.findEmptyStateTitle().should('be.visible');
    return this;
  }

  findFeatureViewRow(featureViewName: string) {
    return this.findFeatureViewsTable().findByText(featureViewName);
  }

  clickFeatureView(featureViewName: string) {
    this.findFeatureViewRow(featureViewName).click();
    return this;
  }

  shouldNavigateToFeatureView(featureViewName: string, projectName: string) {
    cy.url().should('include', `/featureStore/featureViews/${projectName}/${featureViewName}`);
    return this;
  }
}

export const featureDataSourcesTable = new FeatureDataSourcesTable(() =>
  cy.findByTestId('feature-store-data-sources-table'),
);

export const dataSourceDetailsPage = new DataSourceDetailsPage(() => cy.root());
