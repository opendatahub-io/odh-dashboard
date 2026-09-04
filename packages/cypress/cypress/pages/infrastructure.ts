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

  findOpenPopover() {
    return cy.findByRole('dialog');
  }

  private wait() {
    this.shouldHavePageTitle();
    cy.testA11y();
  }
}

export const infrastructurePage = new InfrastructurePage();
