class AutoragRunResultsPage {
  visit(namespace: string, runId: string) {
    cy.visit(`/gen-ai-studio/autorag/results/${namespace}/${runId}`);
  }

  findLeaderboardTable() {
    return cy.findByTestId('leaderboard-table');
  }

  findManageColumnsButton() {
    return cy.findByTestId('manage-columns-button');
  }

  findManageColumnsModal() {
    return cy.findByTestId('manage-columns-modal');
  }

  findManageColumnsSaveButton() {
    return this.findManageColumnsModal().findByRole('button', { name: 'Save' });
  }

  findMetricColumnCheckbox(metricName: string, evaluator: string) {
    return cy.findByTestId(`column-check-metric---${evaluator}---${metricName}--`);
  }

  enableMetricColumn(metricName: string, evaluator: string) {
    this.findManageColumnsButton().click();
    this.findManageColumnsModal().should('be.visible');
    this.findMetricColumnCheckbox(metricName, evaluator).then(($control) => {
      const $checkbox = $control.is('input') ? $control : $control.find('input[type="checkbox"]');
      const isChecked =
        $checkbox.prop('checked') === true ||
        $checkbox.attr('aria-checked') === 'true' ||
        $control.attr('aria-checked') === 'true';
      if (!isChecked) {
        cy.wrap($control).click();
      }
    });
    this.findManageColumnsSaveButton().click();
    this.findManageColumnsModal().should('not.exist');
  }

  findMetricHeader(metricName: string, evaluator?: string) {
    return cy.findByTestId(
      evaluator ? `metric-header-${metricName}-${evaluator}` : `metric-header-${metricName}`,
    );
  }

  findMetricHeaderInfoButton(metricName: string, evaluator: string) {
    return this.findMetricHeader(metricName, evaluator).findByRole('button', {
      name: /more info/i,
    });
  }

  findMetricDescriptionTooltip() {
    return cy.findByRole('tooltip');
  }

  findPatternLink(rank: number) {
    return cy.findByTestId(`pattern-link-${rank}`);
  }

  findPatternDetailsModal() {
    return cy.findByTestId('pattern-details-modal');
  }

  findCIScoresChart() {
    return cy.findByTestId('ci-scores-chart');
  }

  findCIScoresInfo() {
    return cy.findByTestId('ci-scores-info');
  }

  findCIMetricHelp(metricKey: string) {
    return cy.findByTestId(`ci-metric-help-${metricKey}`);
  }

  findCILegendLowHelp() {
    return cy.findByTestId('ci-legend-low-help');
  }

  findPatternDetailsTab(tabKey: string) {
    return cy.findByTestId(`tab-${tabKey}`);
  }

  findMetricGroup(evaluator: string) {
    return cy.findByTestId(`qa-metric-group-${evaluator}`);
  }
}

export const autoragRunResultsPage = new AutoragRunResultsPage();
