import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';
import { TableRow } from '#~/__tests__/cypress/cypress/pages/components/table';

class FeatureViewsTable extends Contextual<HTMLElement> {
  findTable() {
    return cy.findByTestId('feature-views-table');
  }

  findEmptyState() {
    return cy.findByText('No results found');
  }

  findRow(featureViewName: string) {
    return new FeatureViewTableRow(() =>
      this.findTable().find('[data-label="Feature View"]').contains(featureViewName).parents('tr'),
    );
  }

  findRows() {
    return this.findTable().find('tbody tr');
  }

  shouldHaveFeatureViewCount(count: number) {
    if (count === 0) {
      this.findEmptyState().should('exist');
    } else {
      this.findRows().should('have.length', count);
    }
    return this;
  }

  findToolbar() {
    return new FeatureViewToolbar(() => cy.findByTestId('feature-view-table-toolbar'));
  }
}

class FeatureViewToolbar extends Contextual<HTMLElement> {
  findToggleButton(id: string) {
    return this.find().pfSwitch(id).click();
  }

  findFilterMenuOption(id: string, name: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findToggleButton(id).parents().findByRole('menuitem', { name });
  }

  findSearchInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('filter-toolbar-text-field');
  }
}

class FeatureViewTableRow extends TableRow {
  findFeatureViewName() {
    return this.find().find('[data-label="Feature View"]');
  }

  findFeatureViewLink() {
    return this.findFeatureViewName().find('a');
  }

  findTags() {
    return this.find().find('[data-label="Tags"]');
  }

  findFeaturesCount() {
    return this.find().find('[data-label="Features"]');
  }

  findCreatedDate() {
    return this.find().find('[data-label="Created"]');
  }

  findUpdatedDate() {
    return this.find().find('[data-label="Updated"]');
  }

  findOwner() {
    return this.find().find('[data-label="Owner"]');
  }

  findStoreType() {
    return this.find().find('[data-label="Store type"]');
  }

  shouldHaveFeatureViewName(name: string) {
    this.findFeatureViewName().should('contain.text', name);
    return this;
  }

  shouldHaveTag(tag: string) {
    this.findTags().should('contain.text', tag);
    return this;
  }

  shouldHaveFeaturesCount(count: number) {
    this.findFeaturesCount().should('contain.text', count.toString());
    return this;
  }

  shouldHaveOwner(owner: string) {
    this.findOwner().should('contain.text', owner);
    return this;
  }

  clickFeatureViewLink() {
    this.findFeatureViewLink().click();
  }
}

export const featureViewsTable = new FeatureViewsTable(() =>
  cy.findByTestId('feature-views-table'),
);
