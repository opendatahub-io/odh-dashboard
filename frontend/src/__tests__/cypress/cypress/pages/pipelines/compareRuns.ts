import { TableRow } from '~/__tests__/cypress/cypress/pages/components/table';

class CompareRunsGlobal {
  visit(projectName: string, experimentId: string, runIds: string[] = []) {
    cy.visitWithLogin(
      `/experiments/${projectName}/${experimentId}/compareRuns?runs=${runIds.join(',')}`,
    );
  }

  findInvalidRunsError() {
    return cy.findByTestId('compare-runs-invalid-number-runs');
  }
}

class CompareRunsListTableRow extends TableRow {
  findCheckbox() {
    return this.find().find(`[data-label=Checkbox]`).find('input');
  }
}

class CompareRunsListTable {
  find() {
    return cy.findByTestId('compare-runs-table');
  }

  getRowByName(name: string) {
    return new CompareRunsListTableRow(() =>
      this.find().find(`[data-label=Run]`).contains(name).parents('tr'),
    );
  }

  findRowByName(name: string) {
    return this.getRowByName(name).find();
  }

  findSelectAllCheckbox() {
    return this.find().findByLabelText('Select all rows');
  }
}

class CompareRunParamsTable {
  find() {
    return cy.findByTestId('compare-runs-params-table');
  }

  findEmptyState() {
    return this.find().parent().parent().findByTestId('compare-runs-params-empty-state');
  }

  findColumnByName(name: string) {
    return this.find().contains('th', name);
  }

  findParamName(name: string) {
    return this.find().find(`[data-label="${name}"]`);
  }
}

export const compareRunsGlobal = new CompareRunsGlobal();
export const compareRunsListTable = new CompareRunsListTable();
export const compareRunParamsTable = new CompareRunParamsTable();
