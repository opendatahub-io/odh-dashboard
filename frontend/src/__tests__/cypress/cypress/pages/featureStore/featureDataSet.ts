import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';
import { TableRow } from '#~/__tests__/cypress/cypress/pages/components/table';

class FeatureDataSetsTable extends Contextual<HTMLElement> {
  findTable() {
    return cy.findByTestId('feature-store-data-sets-table');
  }

  findEmptyState() {
    return cy.findByText('No data sets');
  }

  findRow(dataSetName: string) {
    return new FeatureDataSetTableRow(() =>
      this.findTable().find('[data-label="Name"]').contains(dataSetName).parents('tr'),
    );
  }

  findRows() {
    return this.findTable().find('tbody tr');
  }

  shouldHaveDataSetCount(count: number) {
    if (count === 0) {
      this.findEmptyState().should('exist');
    } else {
      this.findRows().should('have.length', count);
    }
    return this;
  }

  findToolbar() {
    return new FeatureDataSetToolbar(() => cy.findByTestId('feature-store-table-toolbar'));
  }
}

class FeatureDataSetToolbar extends Contextual<HTMLElement> {
  findToggleButton(id: string) {
    return this.find().pfSwitch(id);
  }

  findFilterMenuOption(id: string, name: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findToggleButton(id).click().parents().findByRole('menuitem', { name });
  }

  findSearchInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('filter-toolbar-text-field');
  }
}

class FeatureDataSetTableRow extends TableRow {
  findDataSetName() {
    return this.find().find('[data-label="Name"]');
  }

  findDataSetLink() {
    return this.findDataSetName().find('a');
  }

  findTags() {
    return this.find().find('[data-label="Tags"]');
  }

  findSourceFeatureService() {
    return this.find().find('[data-label="Source feature service"]');
  }

  findCreatedDate() {
    return this.find().find('[data-label="Created"]');
  }

  findUpdatedDate() {
    return this.find().find('[data-label="Last modified"]');
  }

  findProject() {
    return this.find().find('[data-label="Project"]');
  }

  shouldHaveDataSetName(name: string) {
    this.findDataSetName().should('contain.text', name);
    return this;
  }

  shouldHaveTag(tag: string) {
    this.findTags().should('contain.text', tag);
    return this;
  }

  shouldHaveSourceFeatureService(serviceName: string) {
    this.findSourceFeatureService().should('contain.text', serviceName);
    return this;
  }

  shouldHaveProject(project: string) {
    this.findProject().should('contain.text', project);
    return this;
  }

  clickDataSetLink() {
    return this.findDataSetLink();
  }
}

class FeatureDataSetDetails extends Contextual<HTMLElement> {
  findHeading() {
    return this.find().find('h1');
  }

  findSourceFeatureService() {
    return this.find().findByTestId('data-set-source-feature-service-value');
  }

  findStorage() {
    return this.find().findByTestId('data-set-storage-value');
  }

  findTable() {
    return this.find().findByTestId('data-set-table-value');
  }

  findSchema() {
    return this.find().findByTestId('data-set-schema-value');
  }

  findDatabase() {
    return this.find().findByTestId('data-set-database-value');
  }

  findPath() {
    return this.find().findByTestId('data-set-storage-path-value');
  }

  findLastModified() {
    return this.find().findByTestId('data-set-last-modified-value');
  }

  findCreated() {
    return this.find().findByTestId('data-set-created-date-value');
  }

  findTags() {
    return this.find().findByTestId('feature-store-tags-group');
  }

  findJoinKeys() {
    return this.find().findByTestId('data-set-join-keys');
  }

  findFeaturesTable() {
    return cy.findByTestId('features-table');
  }

  findFeaturesTab() {
    return cy.findByTestId('data-set-features-tab');
  }

  findFeaturesTabContent() {
    return cy.findByTestId('data-set-features-tab-content');
  }

  findBreadcrumbLink() {
    return cy.findByTestId('data-set-details-breadcrumb-link');
  }

  findBreadcrumbItem() {
    return cy.findByTestId('data-set-details-breadcrumb-item');
  }

  shouldHaveSourceFeatureService(serviceName: string) {
    this.findSourceFeatureService().should('contain.text', serviceName);
    return this;
  }

  shouldHaveStorage(storageType: string) {
    this.findStorage().should('contain.text', storageType);
    return this;
  }

  shouldHaveTable(tableName: string) {
    this.findTable().should('contain.text', tableName);
    return this;
  }

  shouldHaveSchema(schemaName: string) {
    this.findSchema().should('contain.text', schemaName);
    return this;
  }

  shouldHaveDatabase(databaseName: string) {
    this.findDatabase().should('contain.text', databaseName);
    return this;
  }

  shouldHavePath(path: string) {
    this.findPath().should('contain.text', path);
    return this;
  }

  shouldHaveTag(tag: string) {
    this.findTags().should('contain.text', tag);
    return this;
  }

  shouldHaveJoinKey(joinKey: string) {
    this.findJoinKeys().should('contain.text', joinKey);
    return this;
  }
}

export const featureDataSetsTable = new FeatureDataSetsTable(() =>
  cy.findByTestId('feature-store-data-sets-table'),
);

export const featureDataSetDetails = new FeatureDataSetDetails(() =>
  cy.findByTestId('data-set-details-tab-content'),
);
