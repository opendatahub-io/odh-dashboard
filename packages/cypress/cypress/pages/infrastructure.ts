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

  shouldNotFoundPage() {
    return cy.findByTestId('not-found-page').should('exist');
  }

  shouldHavePageTitle() {
    return cy.findByTestId('app-page-title').should('have.text', 'Infrastructure');
  }

  findClusterSection() {
    return cy.findByTestId('infrastructure-cluster-section');
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

  findHardwareUsageSection() {
    return cy.findByTestId('infrastructure-hardware-usage-section');
  }

  findHardwareUsageEmpty() {
    return cy.findByTestId('hardware-usage-empty');
  }

  findBorrowingLendingSection() {
    return cy.findByTestId('infrastructure-borrowing-lending-section');
  }

  findBorrowingLendingChart() {
    return cy.findByTestId('borrowing-lending-chart-has-data');
  }

  findBorrowingLendingEmptyState() {
    return cy.findByTestId('borrowing-lending-empty-state');
  }

  findCohortSelect() {
    return cy.findByTestId('borrowing-lending-cohort-select');
  }

  findCqNameFilter() {
    return cy.findByTestId('borrowing-lending-cq-filter');
  }

  findCountLabel() {
    return cy.findByTestId('borrowing-lending-count-label');
  }

  findCQUtilizationSection() {
    return cy.findByTestId('infrastructure-cluster-queue-utilization-section');
  }

  scrollToCQUtilizationSection() {
    this.findCQUtilizationSection().scrollIntoView();
    return this;
  }

  findCQUtilizationSubtitle() {
    return cy.findByTestId('infrastructure-cluster-queue-utilization-description');
  }

  findCQUtilizationEmptyState() {
    return cy.findByTestId('cq-utilization-empty');
  }

  findCQUtilizationError() {
    return cy.findByTestId('cq-utilization-error');
  }

  findCohortAccordion(cohortName: string) {
    return cy.findByTestId(`cohort-accordion-${cohortName}`);
  }

  findCohortBorrowLendBadge() {
    return cy.findByTestId('cohort-borrow-lend-badge');
  }

  findCohortUnallocatedBorrowable() {
    return cy.findByTestId('cohort-unallocated-borrowable');
  }

  findCQCard(cqName: string) {
    return cy.get(`[data-testid="cq-card-${cqName}"]`);
  }

  findCQBorrowBadge() {
    return cy.findByTestId('cq-borrowed-badge');
  }

  findCQLendBadge() {
    return cy.findByTestId('cq-lent-badge');
  }

  findCQWorkloadCounts() {
    return cy.findByTestId('cq-workload-counts');
  }

  findHardwareModelBadge(modelName: string) {
    return cy.findByTestId(`hardware-model-badge-${modelName}`);
  }

  findAcceleratorDonutChart() {
    return cy.findByTestId('accelerator-donut-chart');
  }

  findAcceleratorDonutChartInCard(cqName: string) {
    return this.findCQCard(cqName).findByTestId('accelerator-donut-chart');
  }

  findDcgmComputeDonutInCard(cqName: string) {
    return this.findCQCard(cqName).findByTestId('dcgm-compute-donut');
  }

  findDcgmMemoryDonutInCard(cqName: string) {
    return this.findCQCard(cqName).findByTestId('dcgm-memory-donut');
  }

  findCQLendBadgeInCard(cqName: string) {
    return this.findCQCard(cqName).find('[data-testid="cq-lent-badge"]');
  }

  findCQBorrowBadgeInCard(cqName: string) {
    return this.findCQCard(cqName).find('[data-testid="cq-borrowed-badge"]');
  }

  findWorkloadCountsInCard(cqName: string) {
    return this.findCQCard(cqName).find('[data-testid="cq-workload-counts"]');
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
