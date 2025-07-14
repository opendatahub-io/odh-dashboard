import { TableRow } from '#~/__tests__/cypress/cypress/pages/components/table';

class ManageRunsPage {
  visit(experimentId: string, projectName: string, runIds: string[]) {
    cy.visitWithLogin(
      `/experiments/${projectName}/${experimentId}/compareRuns/add?compareRuns=${runIds.join(',')}`,
    );
    this.wait();
  }

  private wait() {
    this.find();
    cy.testA11y();
  }

  find() {
    return cy.findByTestId('app-page-title').contains('Manage runs');
  }

  findProjectNavigatorLink() {
    return cy.findByTestId('project-navigator-link-in-breadcrumb');
  }

  findBreadcrumb() {
    return this.find()
      .parents('[data-testid="dashboard-page-main"]')
      .findByTestId('manage-runs-page-breadcrumb');
  }
}

class ManageRunsRow extends TableRow {
  findCheckbox() {
    return this.find().find(`[data-label=Checkbox]`).find('input');
  }

  findColumnName(name: string) {
    return this.find().find(`[data-label=Name]`).contains(name);
  }

  findColumnVersion(name: string) {
    return this.find().find(`[data-label="Pipeline"]`).contains(name);
  }

  findStatusSwitchByRowName() {
    return this.find().findByTestId('recurring-run-status-switch');
  }
}

class ManageRunsTable {
  find() {
    return cy.findByTestId('manage-runs-table');
  }

  getRowByName(name: string) {
    return new ManageRunsRow(() =>
      this.find().find(`[data-label=Name]`).contains(name).parents('tr'),
    );
  }

  findUpdateButton() {
    return this.find().findByTestId('manage-runs-update-button');
  }

  findCancelButton() {
    return this.find().findByTestId('manage-runs-cancel-button');
  }
}

export const manageRunsPage = new ManageRunsPage();
export const manageRunsTable = new ManageRunsTable();
