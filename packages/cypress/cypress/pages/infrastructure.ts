import { appChrome } from './appChrome';

class InfrastructurePage {
  visit(wait = true) {
    cy.visitWithLogin('/observe-and-monitor/infrastructure');
    if (wait) {
      this.wait();
    }
  }

  findNavItem() {
    return appChrome.findNavItem({ name: 'Infrastructure', rootSection: 'Observe & monitor' });
  }

  findUtilizationTab() {
    return cy.findByTestId('infrastructure-tab-utilization');
  }

  findQuotaUsageTab() {
    return cy.findByTestId('infrastructure-tab-quota-usage');
  }

  switchToQuotaUsageTab() {
    this.findQuotaUsageTab().click();
    return this;
  }

  shouldNotFoundPage() {
    return cy.findByTestId('not-found-page').should('exist');
  }

  shouldHavePageTitle() {
    return cy.findByTestId('app-page-title').should('have.text', 'Infrastructure');
  }

  findPageSubtitle() {
    return cy.findByTestId('app-page-description');
  }

  findClusterSection() {
    return cy.findByTestId('infrastructure-cluster-section');
  }

  findClusterMetricsError() {
    return cy.findByTestId('cluster-metrics-error');
  }

  findHardwareUsageSection() {
    return cy.findByTestId('infrastructure-hardware-usage-section');
  }

  findHardwareUsageError() {
    return cy.findByTestId('hardware-usage-error');
  }

  findQuotaUsageSection() {
    return cy.findByTestId('infrastructure-quota-usage-section');
  }

  findTotalAcceleratorsCard() {
    return cy.findByTestId('cluster-card-total-accelerators');
  }

  findComputeUtilizationCard() {
    return cy.findByTestId('cluster-card-compute-utilization');
  }

  findMemoryUtilizationCard() {
    return cy.findByTestId('cluster-card-memory-utilization');
  }

  findRefreshBadge() {
    return cy.findByTestId('infrastructure-refresh-badge');
  }

  findQuotaRefreshBadge() {
    return cy.findByTestId('quota-usage-refresh-badge');
  }

  findHardwareUsageEmpty() {
    return cy.findByTestId('hardware-usage-empty');
  }

  findBorrowingSection() {
    return cy.findByTestId('infrastructure-borrowing-section');
  }

  findBorrowingChart() {
    return cy.findByTestId('borrowing-chart-has-data');
  }

  findBorrowingEmptyState() {
    return cy.findByTestId('borrowing-empty-state');
  }

  findBorrowingError() {
    return cy.findByTestId('borrowing-error');
  }

  findBorrowingChartOrEmptyState() {
    return cy.get(
      '[data-testid="borrowing-chart-has-data"], [data-testid="borrowing-empty-state"]',
    );
  }

  shouldHaveBorrowingChartOrEmptyState() {
    this.findBorrowingChartOrEmptyState().should('exist');
    return this;
  }

  findCohortSelect() {
    return cy.findByTestId('borrowing-cohort-select');
  }

  findCqNameFilter() {
    return cy.findByTestId('borrowing-cq-filter');
  }

  findCountLabel() {
    return cy.findByTestId('borrowing-count-label');
  }

  findQuotaUsageDescription() {
    return cy.findByTestId('infrastructure-quota-usage-description');
  }

  findQuotaUsageEmptyState() {
    return cy.findByTestId('quota-usage-empty');
  }

  findQuotaUsageTreeNode(name: string) {
    return this.findQuotaUsageSection().findByTestId(`gpuaas-quota-usage-tree-node-${name}`);
  }

  findQuotaUsageBreadcrumb() {
    return cy.findByTestId('quota-usage-breadcrumb');
  }

  findQuotaUsageBreadcrumbSegment(segment: string) {
    return cy.findByTestId(`quota-usage-breadcrumb-${segment}`);
  }

  findQuotaUsageDetailTitle() {
    return cy.findByTestId('quota-usage-detail-title');
  }

  findQuotaUsageNavSearch() {
    return cy.findByTestId('quota-usage-nav-search');
  }

  findQuotaUsageNavSearchEmpty() {
    return cy.findByTestId('quota-usage-nav-search-empty');
  }

  findQuotaUsageNavSearchOrEmptyState(timeout = 60000) {
    return cy.get(
      '[data-testid="quota-usage-nav-search"], [data-testid="quota-usage-section"], [data-testid="quota-usage-empty"], [data-testid="quota-usage-error"]',
      { timeout },
    );
  }

  shouldHaveQuotaUsageNavSearchOrEmptyState() {
    this.findQuotaUsageSection().should('be.visible');
    this.findQuotaUsageNavSearchOrEmptyState().should('exist');
    return this;
  }

  findQuotaUsageCollapseAll() {
    return cy.findByTestId('quota-usage-collapse-all');
  }

  findQuotaUsageExpandAll() {
    return cy.findByTestId('quota-usage-expand-all');
  }

  findQuotaUsageWorkloadsSection() {
    return cy.findByTestId('quota-usage-workloads-section');
  }

  findClusterQueueWorkloadsTable() {
    return cy.findByTestId('cluster-queue-workloads-table');
  }

  findClusterQueueWorkloadsEmptyState() {
    return cy.findByTestId('cluster-queue-workloads-empty-state');
  }

  findClusterQueueWorkloadsLoading() {
    return cy.findByTestId('cluster-queue-workloads-loading');
  }

  findClusterQueueWorkloadsError() {
    return cy.findByTestId('cluster-queue-workloads-error');
  }

  findClusterQueueWorkloadRow(namespace: string, name: string) {
    return cy.findByTestId(`cluster-queue-workload-row-${namespace}-${name}`);
  }

  findClusterQueueWorkloadsNameFilter() {
    return cy.findByTestId('cluster-queue-workloads-name-filter');
  }

  findClusterQueueWorkloadsStatusFilter() {
    return cy.findByTestId('cluster-queue-workloads-status-filter');
  }

  findQuotaUsageSummarySection() {
    return cy.findByTestId('quota-usage-summary-section');
  }

  findQuotaUsageDetailPartialError() {
    return cy.findByTestId('quota-usage-detail-partial-error');
  }

  findQuotaUsageSummaryWorkloads() {
    return cy.findByTestId('quota-usage-summary-workloads');
  }

  findQuotaUsageSummaryCapacity() {
    return cy.findByTestId('quota-usage-summary-capacity');
  }

  findQuotaUsageSummaryCompute() {
    return cy.findByTestId('quota-usage-summary-compute');
  }

  findQuotaUsageSummaryMemory() {
    return cy.findByTestId('quota-usage-summary-memory');
  }

  findQuotaUsageSummaryCapacityOverQuota() {
    return cy.findByTestId('quota-usage-summary-capacity-over-quota');
  }

  findQuotaUsageSummaryComputeOverQuota() {
    return cy.findByTestId('quota-usage-summary-compute-over-quota');
  }

  findQuotaUsageSummaryMemoryOverQuota() {
    return cy.findByTestId('quota-usage-summary-memory-over-quota');
  }

  findQuotaUsageBorrowingLink() {
    return cy.findByTestId('quota-usage-borrowing-link');
  }

  findQuotaUsageBorrowingEnabledBadge() {
    return cy.findByTestId('quota-usage-borrowing-enabled-badge');
  }

  findQuotaUsageBorrowingClusterQueueList() {
    return cy.findByTestId('quota-usage-borrowing-cluster-queue-list');
  }

  findQuotaUsageBorrowingClusterQueueLink(clusterQueueName: string) {
    return cy.findByTestId(`quota-usage-borrowing-cluster-queue-link-${clusterQueueName}`);
  }

  findQuotaUsageAcceleratorTableSection() {
    return cy.findByTestId('quota-usage-accelerator-table-section');
  }

  findQuotaUsageAcceleratorTableSearch() {
    return cy.findByTestId('quota-usage-accelerator-table-search');
  }

  findQuotaUsageAcceleratorRow(model: string) {
    const modelId = model.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return cy.findByTestId(`quota-usage-accelerator-row-${modelId}`);
  }

  findQuotaUsageMeterCapacity(model: string) {
    const modelId = model.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return cy.findByTestId(`quota-usage-meter-capacity-${modelId}`);
  }

  findQuotaUsageMeterCompute(model: string) {
    const modelId = model.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return cy.findByTestId(`quota-usage-meter-compute-${modelId}`);
  }

  findQuotaUsageMeterMemory(model: string) {
    const modelId = model.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return cy.findByTestId(`quota-usage-meter-memory-${modelId}`);
  }

  findQuotaUsageViewKueueProjectsLink() {
    return cy.findByTestId('quota-usage-view-kueue-projects');
  }

  findKueueProjectsModal() {
    return cy.findByTestId('kueue-projects-modal');
  }

  findKueueProjectsRow(projectName: string) {
    return cy.findByTestId(`kueue-projects-row-${projectName}`);
  }

  findKueueProjectsCloseButton() {
    return cy.findByTestId('kueue-projects-close-button');
  }

  findOpenPopover() {
    return cy.findByRole('dialog');
  }

  private wait() {
    this.shouldHavePageTitle();
    cy.testA11y();
  }
}

export const infrastructurePage = new InfrastructurePage();
