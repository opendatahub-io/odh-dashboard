import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';
import { TableRow } from '#~/__tests__/cypress/cypress/pages/components/table';

class FeaturesTable extends Contextual<HTMLElement> {
  findTable() {
    return cy.findByTestId('features-table');
  }

  findEmptyState() {
    return cy.findByText('No results found');
  }

  findRow(featureName: string) {
    return new FeatureTableRow(() =>
      this.findTable().find('[data-label="Feature"]').contains(featureName).parents('tr'),
    );
  }

  findRows() {
    return this.findTable().find('tbody tr');
  }

  shouldHaveFeatureCount(count: number) {
    if (count === 0) {
      this.findEmptyState().should('exist');
    } else {
      this.findRows().should('have.length', count);
    }
    return this;
  }

  findToolbar() {
    return new FeatureToolbar(() => cy.findByTestId('feature-table-toolbar'));
  }

  // Clear filters button in empty state (with test ID)
  findClearFiltersButton() {
    return cy.findByTestId('clear-filters-button');
  }

  // Clear filters button in toolbar (PatternFly default, no test ID)
  findToolbarClearFiltersButton() {
    return cy.findByRole('button', { name: 'Clear all filters' });
  }
}

class FeatureToolbar extends Contextual<HTMLElement> {
  findToggleButton(id: string) {
    return this.find().pfSwitch(id).click();
  }

  findFilterMenuOption(id: string, name: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findToggleButton(id).parents().findByRole('menuitem', { name });
  }

  findSearchInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('filter-toolbar-text-field');
  }

  findFilterInput(name: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByLabelText(`Filter by ${name}`);
  }

  // Clear filters button in toolbar (PatternFly default)
  findClearFiltersButton() {
    return this.find().findByRole('button', { name: 'Clear all filters' });
  }
}

class FeatureTableRow extends TableRow {
  findFeatureName() {
    return this.find().find('[data-label="Feature"]');
  }

  findFeatureLink() {
    return this.findFeatureName().find('a');
  }

  findProject() {
    return this.find().find('[data-label="Project"]');
  }

  findValueType() {
    return this.find().find('[data-label="Value Type"]');
  }

  findFeatureView() {
    return this.find().find('[data-label="Feature View"]');
  }

  findFeatureViewLink() {
    return this.findFeatureView().find('a');
  }

  findOwner() {
    return this.find().find('[data-label="Owner"]');
  }

  shouldHaveFeatureName(name: string) {
    this.findFeatureName().should('contain.text', name);
    return this;
  }

  shouldHaveProject(project: string) {
    this.findProject().should('contain.text', project);
    return this;
  }

  shouldHaveValueType(valueType: string) {
    this.findValueType().should('contain.text', valueType);
    return this;
  }

  shouldHaveFeatureView(featureView: string) {
    this.findFeatureView().should('contain.text', featureView);
    return this;
  }

  shouldHaveOwner(owner: string) {
    this.findOwner().should('contain.text', owner);
    return this;
  }

  clickFeatureLink() {
    this.findFeatureLink().click();
  }

  clickFeatureViewLink() {
    this.findFeatureViewLink().click();
  }
}

export const featuresTable = new FeaturesTable(() => cy.findByTestId('features-table'));
