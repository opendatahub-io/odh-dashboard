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

  findColumn(columnName: string) {
    return this.findTable().find(`[data-label="${columnName}"]`);
  }

  shouldHaveColumn(columnName: string) {
    this.findColumn(columnName).should('exist');
    return this;
  }

  shouldHaveFeatureViewCount(count: number) {
    if (count === 0) {
      this.findEmptyState().should('exist');
    } else {
      this.findRows().should('have.length', count);
    }
    return this;
  }

  shouldHaveExpectedColumns(expectedColumns: string[]) {
    this.findRows()
      .first()
      .within(() => {
        expectedColumns.forEach((columnName) => {
          cy.get(`[data-label="${columnName}"]`).should('exist');
        });
      });
    return this;
  }

  findToolbar() {
    return new FeatureViewToolbar(() => cy.findByTestId('feature-store-table-toolbar'));
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

  findProject() {
    return this.find().find('[data-label="Project"]');
  }

  findFeatureViewDescription() {
    return this.find().findByTestId('table-row-title-description');
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

  findFeatureServicesCount() {
    return this.find().find('[data-label="Feature Services"]');
  }

  shouldHaveCreatedDate(date: string) {
    this.findCreatedDate().should('contain.text', date);
    return this;
  }

  shouldHaveFeatureServicesCount(count: number) {
    this.findFeatureServicesCount().should('contain.text', count.toString());
    return this;
  }

  shouldHaveUpdatedDate(date: string) {
    this.findUpdatedDate().should('contain.text', date);
    return this;
  }

  shouldHaveFeatureViewDescription(description: string) {
    this.findFeatureViewDescription().should('contain.text', description);
    return this;
  }

  shouldHaveProject(project: string) {
    this.findProject().should('contain.text', project);
    return this;
  }

  shouldHaveStoreType(storeType: string) {
    this.findStoreType().should('contain.text', storeType);
    return this;
  }

  shouldHaveFeatureViewName(name: string) {
    this.findFeatureViewName().should('contain.text', name);
    return this;
  }

  shouldHaveTag(tag: string) {
    this.findTags().should('contain.text', tag);
    return this;
  }

  shouldHaveTagsVisible() {
    this.findTags().should('be.visible');
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

class FeatureViewsPage extends Contextual<HTMLElement> {
  findBreadcrumbLink() {
    return cy.findByTestId('feature-view-details-breadcrumb-link');
  }

  findBreadcrumbItem() {
    return cy.findByTestId('breadcrumb-version-name');
  }

  findPageTitle() {
    return cy.findByTestId('app-page-title');
  }

  shouldHaveBreadcrumbLink(link: string) {
    this.findBreadcrumbLink().should('contain.text', link);
    return this;
  }

  shouldHaveBreadcrumbItem(item: string) {
    this.findBreadcrumbItem().should('contain.text', item);
    return this;
  }

  shouldHaveFeatureViewsPageTitle(title: string) {
    this.findPageTitle().should('contain.text', title);
    return this;
  }
}

export const featureViewsPage = new FeatureViewsPage(() => cy.findByTestId('feature-views-page'));
