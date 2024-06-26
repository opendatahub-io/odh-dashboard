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

class CompareMetricsContent {
  find() {
    return cy.findByTestId('compare-runs-metrics-content');
  }

  findScalarMetricsTable() {
    return cy.findByTestId('compare-runs-scalar-metrics-table');
  }

  findScalarMetricsColumnByName(name: string) {
    return this.findScalarMetricsTable().contains('th', name);
  }

  findScalarMetricName(name: string) {
    return this.findScalarMetricsTable().find(`[data-label="${name}"]`);
  }

  findScalarMetricCell(metricName: string, columnIndex: number) {
    return this.findScalarMetricName(metricName).closest('tr').children().eq(columnIndex);
  }

  findScalarMetricsEmptyState() {
    return cy.findByTestId('compare-runs-scalar-metrics-empty-state');
  }
}

export const compareRunsGlobal = new CompareRunsGlobal();
export const compareRunsListTable = new CompareRunsListTable();
export const compareRunParamsTable = new CompareRunParamsTable();
export const compareRunsMetricsContent = new CompareMetricsContent();
