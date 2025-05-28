import { TableRow } from '#~/__tests__/cypress/cypress/pages/components/table';
import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';

class CompareRunsGlobal {
  visit(projectName: string, experimentId: string, runIds: string[] = []) {
    cy.visitWithLogin(
      `/experiments/${projectName}/${experimentId}/compareRuns?compareRuns=${runIds.join(',')}`,
    );
  }

  findInvalidRunsError() {
    return cy.findByTestId('compare-runs-invalid-number-runs');
  }

  findProjectNavigatorLink() {
    return cy.findByTestId('project-navigator-link');
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
      this.find().find(`[data-label=Name]`).contains(name).parents('tr'),
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

  findScalarMetricsTab() {
    return this.find().findByTestId('compare-runs-scalar-metrics-tab');
  }

  findScalarMetricsTabContent() {
    return new CompareRunsScalarMetrics(() =>
      this.find().findByTestId('compare-runs-scalar-metrics-tab-content').parent(),
    );
  }

  findConfusionMatrixTab() {
    return this.find().findByTestId('compare-runs-confusion-matrix-tab');
  }

  findConfusionMatrixTabContent() {
    return new CompareRunsConfusionMatrix(() =>
      this.find().findByTestId('compare-runs-confusion-matrix-tab-content').parent(),
    );
  }

  findRocCurveTab() {
    return this.find().findByTestId('compare-runs-roc-curve-tab');
  }

  findRocCurveTabContent() {
    return new CompareRunsRocCurve(() =>
      this.find().findByTestId('compare-runs-roc-curve-tab-content').parent(),
    );
  }

  findMarkdownTab() {
    return this.find().findByTestId('compare-runs-markdown-tab');
  }

  findMarkdownTabContent() {
    return new CompareRunsMarkdown(() =>
      this.find().findByTestId('compare-runs-markdown-tab-content').parent(),
    );
  }
}

class RocCurveFilterTableRow extends TableRow {
  findRunName() {
    return this.find().find(`[data-label="Run name"]`);
  }
}

class CompareRunsRocCurve extends Contextual<HTMLElement> {
  findRocCurveEmptyState() {
    return this.find().findByTestId('compare-runs-roc-curve-empty-state');
  }

  findRocCurveTableEmptyState() {
    return this.find().findByTestId('dashboard-empty-table-state');
  }

  getRocCurveRowByName(name: string) {
    return new RocCurveFilterTableRow(() =>
      this.find()
        .find(`[data-label="Execution name > Artifact name"]`)
        .contains(name)
        .parents('tr'),
    );
  }

  findRocCurveSearchBar() {
    return this.find().findByTestId('roc-curve-search');
  }

  findRocCurveGraph() {
    return this.find().findByTestId('roc-curve-graph');
  }

  findRocCurveNoMetricsState() {
    return this.find().findByTestId('compare-runs-roc-curve-no-data-state');
  }
}

class CompareRunsScalarMetrics extends Contextual<HTMLDivElement> {
  findScalarMetricsTable() {
    return this.find().findByTestId('compare-runs-scalar-metrics-table');
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
    return this.find().findByTestId('compare-runs-scalar-metrics-empty-state');
  }

  findScalarMetricsNoMetricsState() {
    return this.find().findByTestId('compare-runs-scalar-metrics-no-data-state');
  }
}

class CompareRunsArtifactSelect extends Contextual<HTMLElement> {
  findSelectOption(name: string) {
    return this.find().findByTestId('pipeline-run-artifact-select').findSelectOption(name);
  }

  findExpandButton() {
    return this.find().findByTestId('pipeline-run-artifact-expand-button');
  }

  findArtifactContent(index = 0) {
    return this.find().findByTestId(`pipeline-run-artifact-content-${index}`);
  }

  findIframeContent(index = 0) {
    return this.findArtifactContent(index)
      .findByTestId('markdown-compare')
      .its('0.contentDocument')
      .its('body');
  }
}

class ConfusionMatrixArtifactSelect extends CompareRunsArtifactSelect {
  findConfusionMatrixGraph(index = 0) {
    return new ConfusionMatrixGraph(() => this.findArtifactContent(index));
  }
}

class CompareRunsMarkdown extends Contextual<HTMLElement> {
  findMarkdownEmptyState() {
    return this.find().findByTestId('compare-runs-markdown-empty-state');
  }

  findExpandedMarkdown() {
    return this.find().findByTestId('compare-runs-markdown-expanded-graph');
  }

  findMarkdownSelect(runId: string) {
    return new CompareRunsArtifactSelect(() =>
      this.find().findByTestId(`compare-runs-markdown-${runId}`),
    );
  }

  findMarkdownNoMetricsState() {
    return this.find().findByTestId('compare-runs-markdown-no-data-state');
  }
}

class CompareRunsConfusionMatrix extends Contextual<HTMLElement> {
  findConfusionMatrixEmptyState() {
    return this.find().findByTestId('compare-runs-confusion-matrix-empty-state');
  }

  findExpandedConfusionMatrix() {
    return new ConfusionMatrixGraph(() =>
      this.find().findByTestId('compare-runs-confusion-matrix-expanded-graph'),
    );
  }

  findConfusionMatrixSelect(runId: string) {
    return new ConfusionMatrixArtifactSelect(() =>
      this.find().findByTestId(`compare-runs-confusion-matrix-${runId}`),
    );
  }

  findConfusionMatrixNoMetricsState() {
    return this.find().findByTestId('compare-runs-confusion-matrix-no-data-state');
  }
}

class ConfusionMatrixGraph extends Contextual<HTMLElement> {
  findLabelY(index: number) {
    return this.find().findByTestId(`confusion-matrix-label-y${index}`);
  }

  findLabelX(index: number) {
    return this.find().findByTestId(`confusion-matrix-label-x${index}`);
  }

  findCell(rowIndex: number, colIndex: number) {
    return this.find().findByTestId(`confusion-matrix-cell-${rowIndex}-${colIndex}`);
  }

  checkLabels(labels: string[]) {
    // Check the labels on the left side (true labels)
    labels.forEach((label, index) => {
      this.findLabelY(index).should('contain.text', label);
    });

    // Check the labels at the bottom (predicted labels)
    labels.forEach((label, index) => {
      this.findLabelX(index).should('contain.text', label);
    });
  }

  checkCells(data: number[][]) {
    // Check the data in the cells
    data.forEach((row, rowIndex) => {
      row.forEach((cell, cellIndex) => {
        this.findCell(rowIndex, cellIndex).should('contain.text', cell.toString());
      });
    });
  }
}

export const compareRunsGlobal = new CompareRunsGlobal();
export const compareRunsListTable = new CompareRunsListTable();
export const compareRunParamsTable = new CompareRunParamsTable();
export const compareRunsMetricsContent = new CompareMetricsContent();
