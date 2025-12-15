import { TableRow } from './components/table';

class FeatureStoreConfigRow extends TableRow {
  findCheckbox() {
    return this.find().find('input[type="checkbox"]');
  }

  shouldHaveConfigName(name: string) {
    this.find().contains(name).should('exist');
    return this;
  }

  shouldHaveProject(project: string) {
    this.find().contains(project).should('exist');
    return this;
  }

  selectConfig() {
    this.findCheckbox().check();
    return this;
  }

  shouldBeAccessible() {
    this.findCheckbox().should('not.be.disabled');
    return this;
  }

  shouldBeInaccessible() {
    this.findCheckbox().should('be.disabled');
    return this;
  }

  hoverOverCheckbox() {
    // PatternFly Tooltip wraps the checkbox in a trigger element
    // We need to hover over the tooltip's trigger wrapper, not the disabled checkbox itself
    // The tooltip trigger is typically a span or div that wraps the checkbox
    this.findCheckbox().parent().trigger('mouseenter', { force: true });
    return this;
  }
}

class FeatureStoreIntegration {
  findEmptyState() {
    return cy.findByTestId('empty-state-feature-store');
  }

  findTable() {
    return cy.findByTestId('feature-store-table');
  }

  findTableHeaderButton(name: string) {
    return this.findTable().find('thead').findByRole('button', { name });
  }

  findErrorState() {
    return cy.findByTestId('error-state-feature-store');
  }

  findNameFilter() {
    return cy.findByTestId('name-filter');
  }

  findFilterDropdown() {
    return cy.findByTestId('feature-store-filter-dropdown');
  }

  selectFilterType(filterType: string) {
    this.findFilterDropdown().click();
    cy.findByRole('menuitem', { name: filterType }).click();
    return this;
  }

  findProjectFilter() {
    return cy.findByTestId('project-filter');
  }

  findShowOnlyAccessibleToggle() {
    return cy.pfSwitch('show-only-accessible-toggle');
  }

  toggleShowOnlyAccessible() {
    this.findShowOnlyAccessibleToggle().click();
    return this;
  }

  findCodeBlockCopyButton() {
    return cy.findByTestId('code-block-copy-button');
  }

  findCodeBlockContent() {
    return cy.get('#code-block-content pre');
  }

  findPythonScriptHeading() {
    return cy.findByText('Python script');
  }

  findSelectConfigmapsText() {
    return cy.findByText('Select configmaps');
  }

  findTooltip() {
    return cy.findByRole('tooltip');
  }

  findClearFiltersButton() {
    return cy.findByRole('button', { name: 'Clear all filters' });
  }

  clearFilters() {
    this.findClearFiltersButton().click();
    return this;
  }

  getConfigRow(configName: string) {
    return new FeatureStoreConfigRow(() =>
      this.findTable().find('tbody').contains('tr', configName).should('exist'),
    );
  }

  shouldHaveConfigCount(count: number) {
    this.findTable().find('tbody tr').should('have.length', count);
    return this;
  }

  shouldShowConfig(configName: string) {
    cy.findByText(configName).should('exist');
    return this;
  }

  shouldNotShowConfig(configName: string) {
    cy.findByText(configName).should('not.exist');
    return this;
  }

  shouldShowSuccessMessage(message: string) {
    cy.findByText(message, { timeout: 5000 }).should('exist');
    return this;
  }
}

export const featureStoreIntegration = new FeatureStoreIntegration();
