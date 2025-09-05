import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';
import { TableRow } from '#~/__tests__/cypress/cypress/pages/components/table';

class FeatureEntitiesTable extends Contextual<HTMLElement> {
  findTable() {
    return cy.findByTestId('feature-store-entities-table');
  }

  findEmptyState() {
    return cy.findByText('No entities');
  }

  findRow(entityName: string) {
    return new FeatureEntityTableRow(() =>
      this.findTable().find('[data-label="Entities"]').contains(entityName).parents('tr'),
    );
  }

  findRows() {
    return this.findTable().find('tbody tr');
  }

  shouldHaveEntityCount(count: number) {
    if (count === 0) {
      this.findEmptyState().should('exist');
    } else {
      this.findRows().should('have.length', count);
    }
    return this;
  }

  findToolbar() {
    return new FeatureEntityToolbar(() => cy.findByTestId('feature-store-table-toolbar'));
  }

  findToolbarClearFiltersButton() {
    return cy.findByRole('button', { name: 'Clear all filters' });
  }
}

class FeatureEntityToolbar extends Contextual<HTMLElement> {
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

class FeatureEntityTableRow extends TableRow {
  findEntityName() {
    return this.find().find('[data-label="Entities"]');
  }

  findEntityLink() {
    return this.findEntityName().find('a');
  }

  findTags() {
    return this.find().find('[data-label="Tags"]');
  }

  findJoinKey() {
    return this.find().find('[data-label="Join key"]');
  }

  findValueType() {
    return this.find().find('[data-label="Value type"]');
  }

  findFeatureViews() {
    return this.find().find('[data-label="Feature Views"]');
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

  findProject() {
    return this.find().find('[data-label="Project"]');
  }

  shouldHaveEntityName(name: string) {
    this.findEntityName().should('contain.text', name);
    return this;
  }

  shouldHaveTag(tag: string) {
    this.findTags().should('contain.text', tag);
    return this;
  }

  shouldHaveJoinKey(joinKey: string) {
    this.findJoinKey().should('contain.text', joinKey);
    return this;
  }

  shouldHaveValueType(valueType: string) {
    this.findValueType().should('contain.text', valueType);
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

  shouldHaveProject(project: string) {
    this.findProject().should('contain.text', project);
    return this;
  }

  clickEntityLink() {
    this.findEntityLink().click();
  }
}

export const featureEntitiesTable = new FeatureEntitiesTable(() =>
  cy.findByTestId('feature-store-entities-table'),
);
