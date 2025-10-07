import type { GrpcResponse } from '#~/__mocks__/mlmd/utils';
import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';

class ArtifactsGlobal {
  visit(projectName: string) {
    cy.visitWithLogin(`/develop-train/pipelines/artifacts/${projectName}`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').contains('Artifacts');
    cy.testA11y();
  }

  findEmptyState() {
    return cy.findByTestId('empty-state-title');
  }

  findTableToolbar() {
    return cy.findByTestId('artifacts-table-toolbar');
  }

  selectFilterByName(name: string) {
    cy.findByTestId('filter-toolbar-dropdown').findDropdownItem(name).click();
  }

  findFilterField() {
    return cy.findByTestId('filter-toolbar-text-field');
  }

  findFilterFieldInput() {
    return this.findFilterField().find('input');
  }

  selectFilterType(type: string) {
    cy.findByTestId('artifact-type-filter-select').findByTestId(type).click();
  }
}

class ArtifactsTable {
  find() {
    return cy.findByTestId('artifacts-list-table');
  }

  findRows() {
    return this.find().find('tbody tr');
  }

  getRowByName(name: string) {
    return new ArtifactsTableRow(() =>
      this.find().find(`[data-label="Artifact"]`).contains(name).parents('tr'),
    );
  }

  findEmptyState() {
    return cy.findByTestId('artifacts-list-empty-state');
  }

  mockGetArtifacts(projectName: string, response: GrpcResponse, times?: number) {
    return cy.interceptOdh(
      'POST /api/service/mlmd/:namespace/:serviceName/ml_metadata.MetadataStoreService/GetArtifacts',
      { path: { namespace: projectName, serviceName: 'dspa' }, times },
      response,
    );
  }
}

class ArtifactsTableRow extends Contextual<HTMLTableRowElement> {
  findName() {
    return this.find().find(`[data-label=Artifact]`);
  }

  findType() {
    return this.find().find(`[data-label=Type]`);
  }

  findId() {
    return this.find().find(`[data-label=ID]`);
  }

  findUri() {
    return this.find().find(`[data-label=URI]`);
  }

  findCreated() {
    return this.find().find(`[data-label=Created]`);
  }

  findLabel() {
    return this.find().findByTestId('model-registered-label');
  }
}

class ArtifactDetails {
  visit(projectName: string, artifactName: string, artifactId: string) {
    cy.visitWithLogin(`/develop-train/pipelines/artifacts/${projectName}/${artifactId}`);
    this.wait(artifactName);
  }

  private wait(pageTitle: string) {
    cy.findByTestId('app-page-title').contains(pageTitle);
    cy.testA11y();
  }

  findProjectNavigatorLink() {
    return cy.findByTestId('project-navigator-link-in-breadcrumb');
  }

  shouldFailToLoadRun() {
    cy.findByTestId('error-icon').should('exist');
    return this;
  }

  findDatasetItemByLabel(label: string) {
    return cy.findByTestId(`dataset-description-list-${label}`);
  }

  findReferenceTable() {
    return cy.findByTestId('artifact-details-reference-table');
  }

  findExecutionLink(name: string) {
    return this.findReferenceTable()
      .find(`[data-label=Name]`)
      .contains('Original execution')
      .parents('tr')
      .find(`[data-label=Link]`)
      .contains(name);
  }

  findPipelineLink(name: string) {
    return this.findReferenceTable()
      .find(`[data-label=Name]`)
      .contains('Original run')
      .parents('tr')
      .find(`[data-label=Link]`)
      .contains(name);
  }

  findCustomPropItemByLabel(label: string) {
    return cy.findByTestId(`custom-props-description-list-${label}`);
  }

  findPropSection() {
    return cy.findByTestId('artifact-properties-section');
  }

  findCustomPropSection() {
    return cy.findByTestId('artifact-custom-properties-section');
  }

  findRegisteredModelSection() {
    return cy.findByTestId('registered-model-details');
  }

  findModelVersionLink() {
    return cy.findByTestId('model-version-link').invoke('attr', 'href');
  }

  mockGetArtifactById(projectName: string, response: GrpcResponse) {
    return cy.interceptOdh(
      'POST /api/service/mlmd/:namespace/:serviceName/ml_metadata.MetadataStoreService/GetArtifactsByID',
      { path: { namespace: projectName, serviceName: 'dspa' } },
      response,
    );
  }
}

export const artifactsGlobal = new ArtifactsGlobal();
export const artifactsTable = new ArtifactsTable();
export const artifactDetails = new ArtifactDetails();
