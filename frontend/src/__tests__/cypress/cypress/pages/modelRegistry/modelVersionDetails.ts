import { modelVersionUrl } from '~/pages/modelRegistry/screens/routeUtils';

class ModelVersionDetails {
  visit() {
    cy.visit(modelVersionUrl('1', '1', 'modelregistry-sample'));
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').should('exist');
    cy.testA11y();
  }

  findVersionId() {
    return cy.findByTestId('model-version-id');
  }

  findDescription() {
    return cy.findByTestId('model-version-description');
  }

  findMoreLabelsButton() {
    return cy.findByTestId('label-group').find('button');
  }

  findStorageLocation() {
    return cy.findByTestId('storage-location');
  }

  shouldContainsModalLabels(labels: string[]) {
    cy.findByTestId('label-group').within(() => labels.map((label) => cy.contains(label)));
    return this;
  }

  findModelVersionDropdownButton() {
    return cy.findByTestId('model-version-toggle-button');
  }

  findModelVersionDropdownSearch() {
    return cy.findByTestId('search-input');
  }

  findModelVersionDropdownItem(name: string) {
    return cy.findByTestId('model-version-selector-list').find('li').contains(name);
  }
}

export const modelVersionDetails = new ModelVersionDetails();
