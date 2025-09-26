import { Contextual } from './components/Contextual';
import { Modal } from './components/Modal';
import { TableRow } from './components/table';

class ModelMetricsGlobal {
  findMetricsToolbarTimeRangeSelect() {
    return cy.findByTestId('metrics-toolbar-time-range-select');
  }

  findMetricsToolbarRefreshIntervalSelect() {
    return cy.findByTestId('metrics-toolbar-refresh-interval-select');
  }

  getMetricsChart(title: string) {
    return new ModelMetricsChart(() => cy.findByTestId(`metrics-card-${title}`).parents());
  }

  getAllMetricsCharts() {
    return cy.findAllByTestId(/metrics-card-.*/);
  }
}

class ModelMetricsChart extends Contextual<HTMLTableRowElement> {
  shouldHaveNoData() {
    this.find().findByTestId('metrics-chart-no-data');
  }

  shouldHaveData() {
    this.find().findByTestId('metrics-chart-has-data');
  }
}

class ModelMetricsPerformance extends ModelMetricsGlobal {
  visit(project: string, model: string) {
    cy.visitWithLogin(`/ai-hub/deployments/${project}/metrics/${model}/performance`);
    this.wait();
  }

  protected wait() {
    cy.findByTestId('performance-metrics-loaded');
    cy.testA11y();
  }

  findTab() {
    return cy.findByTestId('performance-tab');
  }
}

class ModelMetricsNim extends ModelMetricsGlobal {
  visit(project: string, model: string) {
    cy.visitWithLogin(`/ai-hub/deployments/${project}/metrics/${model}/performance`);
    this.wait();
  }

  protected wait() {
    cy.testA11y();
  }

  findTab() {
    return cy.findByTestId('nim-tab');
  }
}

class ModelMetricsKserve extends ModelMetricsPerformance {
  findKserveAreaDisabledCard() {
    return cy.findByTestId('kserve-metrics-disabled');
  }

  findUnsupportedRuntimeCard() {
    return cy.findByTestId('kserve-metrics-runtime-unsupported');
  }

  findUnknownErrorCard() {
    return cy.findByTestId('kserve-unknown-error');
  }
}

class ModelMetricsKserveNim extends ModelMetricsNim {
  findKserveAreaDisabledCard() {
    return cy.findByTestId('kserve-metrics-disabled');
  }

  findUnsupportedRuntimeCard() {
    return cy.findByTestId('kserve-metrics-runtime-unsupported');
  }

  findUnknownErrorCard() {
    return cy.findByTestId('kserve-unknown-error');
  }
}

class ModelMetricsBias extends ModelMetricsGlobal {
  visit(project: string, model: string, disableA11y = false) {
    cy.visitWithLogin(`/ai-hub/deployments/${project}/metrics/${model}/bias`);

    // TODO: disableA11y should be removed once this PF bug is resolved: https://github.com/patternfly/patternfly-react/issues/9968
    this.wait(disableA11y);
  }

  private wait(disableA11y: boolean) {
    cy.findByTestId('bias-metrics-loaded');
    if (!disableA11y) {
      cy.testA11y();
    }
  }

  getMetricsChart(modelTitle: string, sectionTitle?: string) {
    if (!sectionTitle) {
      return super.getMetricsChart(modelTitle);
    }

    return new ModelMetricsChart(() =>
      cy
        .findByTestId(`expandable-section-${sectionTitle}`)
        .findByTestId(`metrics-card-${modelTitle}`)
        .parents(),
    );
  }

  findTab() {
    return cy.findByTestId('bias-tab');
  }

  findConfigSelector() {
    return cy.findByTestId('bias-metric-config-toolbar').find('#bias-metric-config-selector');
  }

  selectMetric(name: string) {
    cy.findByRole('option', { name }).click();
  }

  shouldNotBeConfigured() {
    cy.findByTestId('bias-metrics-empty-state').should('exist');
  }
}

class ServerMetrics extends ModelMetricsGlobal {
  visit(project: string, server: string) {
    cy.visitWithLogin(`/projects/${project}/metrics/server/${server}`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('server-metrics-loaded');
    cy.testA11y();
  }
}

class ModelMetricsConfigureSection {
  visit(project: string, model: string) {
    cy.visitWithLogin(`/ai-hub/deployments/${project}/metrics/${model}/configure`);
    this.wait();
  }

  private wait() {
    this.findTable();
    cy.testA11y();
  }

  private findTable() {
    return cy.findByTestId('metrics-configure-table-loaded');
  }

  getMetricRow(name: string) {
    return new MetricRow(() =>
      this.findTable().find('[data-label=Name]').contains(name).parents('tr'),
    );
  }

  findConfigureMetricButton() {
    return cy.findByRole('button', { name: 'Configure metric' });
  }
}

class MetricRow extends TableRow {
  findExpandButton() {
    return this.find().findByTestId('bias-configuration-expand-cell');
  }

  findExpansion() {
    return this.find().siblings();
  }
}
class ConfigureBiasMetricModal extends Modal {
  constructor() {
    super('Configure bias metric');
  }

  findSubmitButton() {
    return this.findFooter().findByTestId('modal-submit-button');
  }

  findMetricNameInput() {
    return this.find().findByTestId('metric-name-input');
  }

  findProtectedAttributeInput() {
    return this.find().findByTestId('protected-attribute');
  }

  findMetricTypeSelect() {
    return this.find().find('#metric-type');
  }

  findPrivilegedValueInput() {
    return this.find().findByTestId('privileged-value');
  }

  findUnprivilegedValueInput() {
    return this.find().findByTestId('unprivileged-value');
  }

  findOutputInput() {
    return this.find().findByTestId('output');
  }

  findOutputValueInput() {
    return this.find().findByTestId('output-value');
  }

  findViolationThresholdInput() {
    return this.find().findByTestId('violation-threshold');
  }

  findMetricBatchSizeInput() {
    return this.find().findByTestId('metric-batch-size');
  }
}

export const modelMetricsPerformance = new ModelMetricsPerformance();
export const modelMetricsNim = new ModelMetricsNim();
export const modelMetricsBias = new ModelMetricsBias();
export const serverMetrics = new ServerMetrics();
export const modelMetricsConfigureSection = new ModelMetricsConfigureSection();
export const configureBiasMetricModal = new ConfigureBiasMetricModal();
export const modelMetricsKserve = new ModelMetricsKserve();
export const modelMetricsKserveNim = new ModelMetricsKserveNim();
