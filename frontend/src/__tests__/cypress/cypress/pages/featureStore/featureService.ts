import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';
import { TableRow } from '#~/__tests__/cypress/cypress/pages/components/table';

class FeatureServicesTable extends Contextual<HTMLElement> {
  findTable() {
    return cy.findByTestId('feature-services-table');
  }

  findEmptyState() {
    return cy.findByText('No results found');
  }

  findRow(featureServiceName: string) {
    return new FeatureServiceTableRow(() =>
      this.findTable()
        .find('[data-label="Feature service"]')
        .contains(featureServiceName)
        .parents('tr'),
    );
  }

  findRows() {
    return this.findTable().find('tbody tr');
  }

  shouldHaveFeatureServiceCount(count: number) {
    if (count === 0) {
      this.findEmptyState().should('exist');
    } else {
      this.findRows().should('have.length', count);
    }
    return this;
  }

  findToolbar() {
    return new FeatureServiceToolbar(() => cy.findByTestId('feature-store-table-toolbar'));
  }
}

class FeatureServiceTableRow extends TableRow {
  shouldHaveFeatureServiceName(name: string) {
    this.find().find('[data-label="Feature service"]').should('contains.text', name);
    return this;
  }

  shouldHaveFeaturesViewsCount(count: number) {
    this.find().find('[data-label="Feature views"]').should('contain.text', count.toString());
    return this;
  }

  shouldHaveOwner(owner: string) {
    this.find().find('[data-label="Owner"]').should('have.text', owner);
    return this;
  }

  shouldHaveTag(tag: string) {
    this.find().find('[data-label="Tags"]').should('contain.text', tag);
    return this;
  }
}

class FeatureServiceToolbar extends Contextual<HTMLElement> {
  findFilterMenuOption(testId: string, name: string) {
    this.find().findByTestId(testId).click();
    return cy.findByRole('menuitem', { name });
  }

  findSearchInput() {
    return this.find().findByTestId('filter-toolbar-text-field');
  }
}

export const featureServicesTable = new FeatureServicesTable(() =>
  cy.findByTestId('feature-services-table'),
);
