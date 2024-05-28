import {
  modelVersionArchiveDetailsUrl,
  modelVersionArchiveUrl,
  modelVersionListUrl,
  modelVersionUrl,
} from '~/pages/modelRegistry/screens/routeUtils';
import { TableRow } from '~/__tests__/cypress/cypress/pages/components/table';
import { Modal } from '~/__tests__/cypress/cypress/pages/components/Modal';

class ArchiveVersionTableRow extends TableRow {
  findName() {
    return this.find().findByTestId('model-version-name');
  }

  findDescription() {
    return this.find().findByTestId('model-version-description');
  }

  findLabelPopoverText() {
    return this.find().findByTestId('popover-label-text');
  }

  findLabelModalText() {
    return this.find().findByTestId('modal-label-text');
  }

  shouldContainsPopoverLabels(labels: string[]) {
    cy.findByTestId('popover-label-group').within(() => labels.map((label) => cy.contains(label)));
    return this;
  }
}

class RestoreVersionModal extends Modal {
  constructor() {
    super('Restore version?');
  }

  findRestoreButton() {
    return cy.findByTestId('modal-submit-button');
  }
}

class ArchiveVersionModal extends Modal {
  constructor() {
    super('Archive version?');
  }

  findArchiveButton() {
    return cy.findByTestId('modal-submit-button');
  }

  findModalTextInput() {
    return cy.findByTestId('confirm-archive-input');
  }
}

class ModelVersionArchive {
  private wait() {
    cy.findByTestId('app-page-title').should('exist');
    cy.testA11y();
  }

  visit() {
    cy.visitWithLogin(modelVersionArchiveUrl('1', 'modelregistry-sample'));
    this.wait();
  }

  visitArchiveVersionDetail() {
    cy.visitWithLogin(modelVersionArchiveDetailsUrl('2', '1', 'modelregistry-sample'));
  }

  visitModelVersionList() {
    cy.visitWithLogin(modelVersionListUrl('1', 'modelregistry-sample'));
    this.wait();
  }

  visitModelVersionDetails() {
    cy.visitWithLogin(modelVersionUrl('3', '1', 'modelregistry-sample'));
    this.wait();
  }

  findTableKebabMenu() {
    return cy.findByTestId('model-versions-table-kebab-action');
  }

  findModelVersionsTableKebab() {
    return cy.findByTestId('model-versions-table-kebab-action');
  }

  shouldArchiveVersionsEmpty() {
    cy.findByTestId('empty-archive-state').should('exist');
  }

  findArchiveVersionBreadcrumbItem() {
    return cy.findByTestId('archive-version-page-breadcrumb');
  }

  findArchiveVersionTable() {
    return cy.findByTestId('model-versions-archive-table');
  }

  findArchiveVersionsTableRows() {
    return this.findArchiveVersionTable().find('tbody tr');
  }

  findRestoreButton() {
    return cy.findByTestId('restore-button');
  }

  getRow(name: string) {
    return new ArchiveVersionTableRow(() =>
      this.findArchiveVersionTable()
        .find(`[data-label="Version name"]`)
        .contains(name)
        .parents('tr'),
    );
  }

  findModelVersionsDetailsHeaderAction() {
    return cy.findByTestId('model-version-details-action-button');
  }
}

export const modelVersionArchive = new ModelVersionArchive();
export const restoreVersionModal = new RestoreVersionModal();
export const archiveVersionModal = new ArchiveVersionModal();
